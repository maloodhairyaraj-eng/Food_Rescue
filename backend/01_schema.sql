--
-- PostgreSQL database dump
--

\restrict ivHyPijTAkKCPfe9yUQyQfSLffrf06DgKRHxUBSA11UDQ9RgoNRm1PKJutMBD1F

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: enforce_full_listing_request(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_full_listing_request() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
      listing_quantity INTEGER;
    BEGIN
      SELECT quantity INTO listing_quantity
      FROM food_listings
      WHERE id = NEW.food_listing_id;

      IF listing_quantity IS NULL THEN
        RAISE EXCEPTION 'Food listing does not exist';
      END IF;

      IF NEW.requested_quantity <> listing_quantity THEN
        RAISE EXCEPTION
          'Pickup request must reserve the full listing quantity';
      END IF;

      RETURN NEW;
    END;
    $$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: food_listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.food_listings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    donor_organization_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    food_type character varying(30) NOT NULL,
    quantity integer NOT NULL,
    quantity_unit character varying(30) DEFAULT 'meals'::character varying NOT NULL,
    prepared_at timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    pickup_start_at timestamp with time zone NOT NULL,
    pickup_end_at timestamp with time zone NOT NULL,
    pickup_address text NOT NULL,
    pickup_location public.geography(Point,4326) NOT NULL,
    status character varying(30) DEFAULT 'available'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reserved_at timestamp with time zone,
    CONSTRAINT food_listings_food_type_check CHECK (((food_type)::text = ANY ((ARRAY['veg'::character varying, 'non_veg'::character varying, 'vegan'::character varying, 'mixed'::character varying])::text[]))),
    CONSTRAINT food_listings_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT food_listings_status_check CHECK (((status)::text = ANY ((ARRAY['available'::character varying, 'reserved'::character varying, 'picked_up'::character varying, 'completed'::character varying, 'expired'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT food_preparation_before_pickup_end CHECK (((prepared_at IS NULL) OR (prepared_at < pickup_end_at))),
    CONSTRAINT pickup_before_expiry CHECK ((pickup_end_at <= expires_at)),
    CONSTRAINT valid_expiry_window CHECK ((expires_at >= pickup_start_at)),
    CONSTRAINT valid_pickup_window CHECK ((pickup_end_at > pickup_start_at)),
    CONSTRAINT valid_preparation_time CHECK (((prepared_at IS NULL) OR (expires_at > prepared_at)))
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_user_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    organization_type character varying(30) NOT NULL,
    description text,
    contact_phone character varying(20),
    address text,
    location public.geography(Point,4326),
    is_verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    verification_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    verified_by uuid,
    verified_at timestamp with time zone,
    rejection_reason text,
    CONSTRAINT organization_rejection_reason_check CHECK ((((verification_status)::text <> 'rejected'::text) OR ((rejection_reason IS NOT NULL) AND (length(TRIM(BOTH FROM rejection_reason)) > 0)))),
    CONSTRAINT organization_verification_consistency CHECK ((is_verified = ((verification_status)::text = 'approved'::text))),
    CONSTRAINT organization_verification_status_check CHECK (((verification_status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[]))),
    CONSTRAINT organizations_organization_type_check CHECK (((organization_type)::text = ANY ((ARRAY['ngo'::character varying, 'restaurant'::character varying, 'hostel'::character varying, 'caterer'::character varying, 'other_donor'::character varying])::text[])))
);


--
-- Name: pgmigrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pgmigrations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    run_on timestamp without time zone NOT NULL
);


--
-- Name: pgmigrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pgmigrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pgmigrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pgmigrations_id_seq OWNED BY public.pgmigrations.id;


--
-- Name: pickup_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pickup_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pickup_request_id uuid NOT NULL,
    volunteer_id uuid NOT NULL,
    status character varying(30) DEFAULT 'assigned'::character varying NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    picked_up_at timestamp with time zone,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pickup_assignments_status_check CHECK (((status)::text = ANY ((ARRAY['assigned'::character varying, 'accepted'::character varying, 'in_transit'::character varying, 'delivered'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT valid_assignment_times CHECK ((((picked_up_at IS NULL) OR (picked_up_at >= assigned_at)) AND ((delivered_at IS NULL) OR (picked_up_at IS NOT NULL)) AND ((delivered_at IS NULL) OR (delivered_at >= picked_up_at))))
);


--
-- Name: pickup_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pickup_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    food_listing_id uuid NOT NULL,
    ngo_organization_id uuid NOT NULL,
    requested_by_user_id uuid NOT NULL,
    requested_quantity integer NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    decided_by uuid,
    decided_at timestamp with time zone,
    decision_reason text,
    CONSTRAINT pickup_decision_metadata_check CHECK (((((status)::text = ANY ((ARRAY['pending'::character varying, 'cancelled'::character varying])::text[])) AND (decided_at IS NULL) AND (decided_by IS NULL)) OR (((status)::text = ANY ((ARRAY['approved'::character varying, 'rejected'::character varying, 'completed'::character varying])::text[])) AND (decided_at IS NOT NULL)))),
    CONSTRAINT pickup_rejection_reason_check CHECK ((((status)::text <> 'rejected'::text) OR ((decision_reason IS NOT NULL) AND (length(TRIM(BOTH FROM decision_reason)) > 0)))),
    CONSTRAINT pickup_requests_requested_quantity_check CHECK ((requested_quantity > 0)),
    CONSTRAINT pickup_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'cancelled'::character varying, 'completed'::character varying])::text[])))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name character varying(150) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    phone character varying(20),
    role character varying(20) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'ngo'::character varying, 'donor'::character varying, 'volunteer'::character varying])::text[])))
);


--
-- Name: volunteer_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.volunteer_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pickup_request_id uuid NOT NULL,
    volunteer_user_id uuid NOT NULL,
    assigned_by_user_id uuid NOT NULL,
    status character varying(20) DEFAULT 'assigned'::character varying NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    picked_up_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT volunteer_assignment_status_check CHECK (((status)::text = ANY ((ARRAY['assigned'::character varying, 'picked_up'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT volunteer_assignment_timeline_check CHECK (((((status)::text <> 'picked_up'::text) OR (picked_up_at IS NOT NULL)) AND (((status)::text <> 'completed'::text) OR ((picked_up_at IS NOT NULL) AND (completed_at IS NOT NULL)))))
);


--
-- Name: volunteers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.volunteers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    location public.geography(Point,4326),
    is_available boolean DEFAULT false NOT NULL,
    vehicle_type character varying(30),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT volunteers_vehicle_type_check CHECK (((vehicle_type)::text = ANY ((ARRAY['walking'::character varying, 'bicycle'::character varying, 'bike'::character varying, 'car'::character varying, 'van'::character varying])::text[])))
);


--
-- Name: pgmigrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pgmigrations ALTER COLUMN id SET DEFAULT nextval('public.pgmigrations_id_seq'::regclass);


--
-- Name: food_listings food_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.food_listings
    ADD CONSTRAINT food_listings_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: pgmigrations pgmigrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pgmigrations
    ADD CONSTRAINT pgmigrations_pkey PRIMARY KEY (id);


--
-- Name: pickup_assignments pickup_assignments_pickup_request_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pickup_assignments
    ADD CONSTRAINT pickup_assignments_pickup_request_id_key UNIQUE (pickup_request_id);


--
-- Name: pickup_assignments pickup_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pickup_assignments
    ADD CONSTRAINT pickup_assignments_pkey PRIMARY KEY (id);


--
-- Name: pickup_requests pickup_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pickup_requests
    ADD CONSTRAINT pickup_requests_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: volunteer_assignments volunteer_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volunteer_assignments
    ADD CONSTRAINT volunteer_assignments_pkey PRIMARY KEY (id);


--
-- Name: volunteers volunteers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volunteers
    ADD CONSTRAINT volunteers_pkey PRIMARY KEY (id);


--
-- Name: volunteers volunteers_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volunteers
    ADD CONSTRAINT volunteers_user_id_key UNIQUE (user_id);


--
-- Name: food_listings_donor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX food_listings_donor_idx ON public.food_listings USING btree (donor_organization_id);


--
-- Name: food_listings_expiry_maintenance_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX food_listings_expiry_maintenance_idx ON public.food_listings USING btree (expires_at, pickup_end_at) WHERE ((status)::text = 'available'::text);


--
-- Name: food_listings_location_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX food_listings_location_idx ON public.food_listings USING gist (pickup_location);


--
-- Name: food_listings_status_expiry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX food_listings_status_expiry_idx ON public.food_listings USING btree (status, expires_at);


--
-- Name: organizations_location_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX organizations_location_idx ON public.organizations USING gist (location);


--
-- Name: organizations_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX organizations_owner_idx ON public.organizations USING btree (owner_user_id);


--
-- Name: organizations_owner_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX organizations_owner_unique_idx ON public.organizations USING btree (owner_user_id);


--
-- Name: organizations_verification_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX organizations_verification_status_idx ON public.organizations USING btree (verification_status);


--
-- Name: pickup_assignments_volunteer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pickup_assignments_volunteer_idx ON public.pickup_assignments USING btree (volunteer_id);


--
-- Name: pickup_requests_listing_history_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pickup_requests_listing_history_idx ON public.pickup_requests USING btree (food_listing_id, created_at DESC);


--
-- Name: pickup_requests_listing_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pickup_requests_listing_idx ON public.pickup_requests USING btree (food_listing_id);


--
-- Name: pickup_requests_ngo_history_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pickup_requests_ngo_history_idx ON public.pickup_requests USING btree (ngo_organization_id, created_at DESC);


--
-- Name: pickup_requests_ngo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pickup_requests_ngo_idx ON public.pickup_requests USING btree (ngo_organization_id);


--
-- Name: pickup_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pickup_requests_status_idx ON public.pickup_requests USING btree (status, created_at);


--
-- Name: unique_active_listing_reservation; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_active_listing_reservation ON public.pickup_requests USING btree (food_listing_id) WHERE ((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying])::text[]));


--
-- Name: unique_active_ngo_pickup_request; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_active_ngo_pickup_request ON public.pickup_requests USING btree (food_listing_id, ngo_organization_id) WHERE ((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'completed'::character varying])::text[]));


--
-- Name: unique_active_volunteer_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_active_volunteer_assignment ON public.volunteer_assignments USING btree (pickup_request_id) WHERE ((status)::text = ANY ((ARRAY['assigned'::character varying, 'picked_up'::character varying])::text[]));


--
-- Name: uq_volunteer_one_active_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_volunteer_one_active_assignment ON public.volunteer_assignments USING btree (volunteer_user_id) WHERE ((status)::text = ANY ((ARRAY['assigned'::character varying, 'picked_up'::character varying])::text[]));


--
-- Name: uq_volunteers_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_volunteers_user_id ON public.volunteers USING btree (user_id);


--
-- Name: users_email_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_unique_idx ON public.users USING btree (lower((email)::text));


--
-- Name: volunteer_assignments_one_per_request_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX volunteer_assignments_one_per_request_idx ON public.volunteer_assignments USING btree (pickup_request_id);


--
-- Name: volunteer_assignments_request_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX volunteer_assignments_request_idx ON public.volunteer_assignments USING btree (pickup_request_id);


--
-- Name: volunteer_assignments_volunteer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX volunteer_assignments_volunteer_idx ON public.volunteer_assignments USING btree (volunteer_user_id, assigned_at DESC);


--
-- Name: volunteers_location_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX volunteers_location_idx ON public.volunteers USING gist (location);


--
-- Name: food_listings food_listings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER food_listings_updated_at BEFORE UPDATE ON public.food_listings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: organizations organizations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: pickup_assignments pickup_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER pickup_assignments_updated_at BEFORE UPDATE ON public.pickup_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: pickup_requests pickup_request_full_quantity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER pickup_request_full_quantity BEFORE INSERT OR UPDATE OF requested_quantity, food_listing_id ON public.pickup_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_full_listing_request();


--
-- Name: pickup_requests pickup_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER pickup_requests_updated_at BEFORE UPDATE ON public.pickup_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: volunteer_assignments volunteer_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER volunteer_assignments_updated_at BEFORE UPDATE ON public.volunteer_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: volunteers volunteers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER volunteers_updated_at BEFORE UPDATE ON public.volunteers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: food_listings food_listings_donor_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.food_listings
    ADD CONSTRAINT food_listings_donor_organization_id_fkey FOREIGN KEY (donor_organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;


--
-- Name: organizations organizations_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: organizations organizations_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: pickup_assignments pickup_assignments_pickup_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pickup_assignments
    ADD CONSTRAINT pickup_assignments_pickup_request_id_fkey FOREIGN KEY (pickup_request_id) REFERENCES public.pickup_requests(id) ON DELETE RESTRICT;


--
-- Name: pickup_assignments pickup_assignments_volunteer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pickup_assignments
    ADD CONSTRAINT pickup_assignments_volunteer_id_fkey FOREIGN KEY (volunteer_id) REFERENCES public.volunteers(id) ON DELETE RESTRICT;


--
-- Name: pickup_requests pickup_requests_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pickup_requests
    ADD CONSTRAINT pickup_requests_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: pickup_requests pickup_requests_food_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pickup_requests
    ADD CONSTRAINT pickup_requests_food_listing_id_fkey FOREIGN KEY (food_listing_id) REFERENCES public.food_listings(id) ON DELETE RESTRICT;


--
-- Name: pickup_requests pickup_requests_ngo_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pickup_requests
    ADD CONSTRAINT pickup_requests_ngo_organization_id_fkey FOREIGN KEY (ngo_organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;


--
-- Name: pickup_requests pickup_requests_requested_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pickup_requests
    ADD CONSTRAINT pickup_requests_requested_by_user_id_fkey FOREIGN KEY (requested_by_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: volunteer_assignments volunteer_assignments_assigned_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volunteer_assignments
    ADD CONSTRAINT volunteer_assignments_assigned_by_user_id_fkey FOREIGN KEY (assigned_by_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: volunteer_assignments volunteer_assignments_pickup_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volunteer_assignments
    ADD CONSTRAINT volunteer_assignments_pickup_request_id_fkey FOREIGN KEY (pickup_request_id) REFERENCES public.pickup_requests(id) ON DELETE RESTRICT;


--
-- Name: volunteer_assignments volunteer_assignments_volunteer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volunteer_assignments
    ADD CONSTRAINT volunteer_assignments_volunteer_user_id_fkey FOREIGN KEY (volunteer_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: volunteers volunteers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volunteers
    ADD CONSTRAINT volunteers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict ivHyPijTAkKCPfe9yUQyQfSLffrf06DgKRHxUBSA11UDQ9RgoNRm1PKJutMBD1F

