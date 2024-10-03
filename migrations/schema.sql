--
-- PostgreSQL database dump
--

-- Dumped from database version 15.2 (Debian 15.2-1.pgdg110+1)
-- Dumped by pg_dump version 15.2 (Debian 15.2-1.pgdg110+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track execution statistics of all SQL statements executed';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry, geography, and raster spatial types and functions';


--
-- Name: delete_user(integer); Type: PROCEDURE; Schema: public; Owner: -
--

-- CREATE PROCEDURE public.delete_user(IN uid integer)
--     LANGUAGE sql
--     AS $$;
-- update groups set created_by_id = null where created_by_id = uid;
-- update comments set deactivated_by_id = null where deactivated_by_id = uid;
-- update follows set added_by_id = null where added_by_id = uid;
-- update groups_tags set user_id = null where user_id = uid;
-- delete from thanks where comment_id in (select id from comments where user_id = uid);
-- delete from notifications where activity_id in (select id from activities where reader_id = uid);
-- delete from notifications where activity_id in (select id from activities where actor_id = uid);
-- delete from comments where user_id = uid;
-- delete from contributions where user_id = uid;
-- delete from devices where user_id = uid;
-- delete from group_invites where used_by_id = uid;
-- delete from group_invites where invited_by_id = uid;
-- delete from group_memberships where user_id = uid;
-- delete from linked_account where user_id = uid;
-- delete from skills_users where user_id = uid;
-- delete from posts_about_users where user_id = uid;
-- delete from posts_users where user_id = uid;
-- delete from tag_follows where user_id = uid;
-- delete from thanks where thanked_by_id = uid;
-- delete from user_connections where user_id = uid;
-- delete from user_external_data where user_id = uid;
-- delete from user_post_relevance where user_id = uid;
-- delete from activities where actor_id = uid;
-- delete from activities where reader_id = uid;
-- delete from join_request_question_answers where join_request_id in (select id from join_requests where user_id = uid);
-- delete from join_requests where user_id = uid;
-- delete from votes where user_id = uid;
-- delete from users where id = uid;
-- $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activities (
    id integer NOT NULL,
    actor_id bigint,
    reader_id bigint,
    post_id bigint,
    comment_id bigint,
    unread boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    community_id bigint,
    meta jsonb DEFAULT '{}'::jsonb,
    parent_comment_id bigint,
    contribution_id bigint,
    project_contribution_id bigint,
    group_id bigint,
    other_group_id bigint
);


--
-- Name: activity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_id_seq OWNED BY public.activities.id;


--
-- Name: agreements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agreements (
    id integer NOT NULL,
    title text,
    description text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: agreements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agreements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agreements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agreements_id_seq OWNED BY public.agreements.id;


--
-- Name: blocked_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blocked_users (
    id integer NOT NULL,
    user_id bigint,
    blocked_user_id bigint,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: blocked_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.blocked_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: blocked_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.blocked_users_id_seq OWNED BY public.blocked_users.id;


--
-- Name: collections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collections (
    id integer NOT NULL,
    user_id bigint,
    group_id bigint,
    is_active boolean DEFAULT true,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: collections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.collections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: collections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.collections_id_seq OWNED BY public.collections.id;


--
-- Name: collections_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collections_posts (
    id integer NOT NULL,
    collection_id bigint NOT NULL,
    post_id bigint NOT NULL,
    user_id bigint NOT NULL,
    "order" integer DEFAULT 0,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: collections_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.collections_posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: collections_posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.collections_posts_id_seq OWNED BY public.collections_posts.id;


--
-- Name: comment_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comment_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id bigint DEFAULT nextval('public.comment_seq'::regclass) NOT NULL,
    user_id bigint,
    post_id bigint,
    created_at timestamp with time zone,
    text text,
    active boolean,
    deactivated_reason character varying(255),
    deactivated_by_id bigint,
    deactivated_at timestamp with time zone,
    recent boolean,
    created_from character varying(255),
    comment_id bigint,
    edited_at timestamp with time zone
);


--
-- Name: comments_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments_tags (
    id integer NOT NULL,
    comment_id bigint,
    tag_id bigint,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: comments_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comments_tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comments_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comments_tags_id_seq OWNED BY public.comments_tags.id;


--
-- Name: common_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.common_roles (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    emoji text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: common_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.common_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: common_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.common_roles_id_seq OWNED BY public.common_roles.id;


--
-- Name: common_roles_responsibilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.common_roles_responsibilities (
    id integer NOT NULL,
    common_role_id bigint,
    responsibility_id bigint
);


--
-- Name: common_roles_responsibilities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.common_roles_responsibilities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: common_roles_responsibilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.common_roles_responsibilities_id_seq OWNED BY public.common_roles_responsibilities.id;


--
-- Name: community_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.community_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: communities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.communities (
    id bigint DEFAULT nextval('public.community_seq'::regclass) NOT NULL,
    name character varying(255) NOT NULL,
    avatar_url character varying(255),
    background_url character varying(255),
    beta_access_code character varying(255),
    description text,
    slug character varying(255) NOT NULL,
    daily_digest boolean DEFAULT true,
    membership_fee bigint,
    plan_guid character varying(63),
    banner_url text,
    category character varying(64),
    created_at timestamp without time zone,
    created_by_id bigint,
    banner_pos character varying(32),
    leader_id bigint,
    welcome_message text,
    settings jsonb DEFAULT '{}'::jsonb,
    default_public_content boolean DEFAULT false,
    network_id bigint,
    location character varying(255),
    slack_hook_url text,
    slack_team text,
    slack_configure_url text,
    active boolean DEFAULT true,
    num_members integer DEFAULT 0,
    hidden boolean DEFAULT false NOT NULL,
    allow_community_invites boolean DEFAULT false,
    location_id bigint,
    is_public boolean DEFAULT false,
    is_auto_joinable boolean DEFAULT false,
    public_member_directory boolean DEFAULT false
);


--
-- Name: groups_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groups_tags (
    id integer NOT NULL,
    community_id bigint,
    tag_id bigint,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    user_id bigint,
    description text,
    is_default boolean DEFAULT false,
    num_followers integer DEFAULT 0,
    visibility integer DEFAULT 1,
    group_id bigint NOT NULL
);


--
-- Name: communities_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.communities_tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: communities_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.communities_tags_id_seq OWNED BY public.groups_tags.id;


--
-- Name: communities_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.communities_users (
    user_id bigint NOT NULL,
    community_id bigint NOT NULL,
    role smallint,
    created_at timestamp without time zone,
    active boolean,
    deactivated_at timestamp with time zone,
    deactivator_id bigint,
    last_viewed_at timestamp with time zone,
    id integer NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb,
    new_post_count integer DEFAULT 0
);


--
-- Name: community_invite_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.community_invite_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contributor_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contributor_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contributions (
    id bigint DEFAULT nextval('public.contributor_seq'::regclass) NOT NULL,
    post_id bigint NOT NULL,
    user_id bigint NOT NULL,
    contributed_at timestamp with time zone NOT NULL
);


--
-- Name: custom_view_topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_view_topics (
    id integer NOT NULL,
    custom_view_id bigint NOT NULL,
    tag_id bigint NOT NULL
);


--
-- Name: custom_view_topics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.custom_view_topics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: custom_view_topics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.custom_view_topics_id_seq OWNED BY public.custom_view_topics.id;


--
-- Name: custom_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_views (
    id integer NOT NULL,
    group_id bigint,
    is_active boolean DEFAULT true,
    search_text character varying(255),
    icon character varying(255),
    name character varying(255),
    external_link character varying(255),
    default_view_mode character varying(255),
    active_posts_only boolean,
    post_types character varying(255)[],
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    "order" integer NOT NULL,
    collection_id bigint,
    default_sort character varying(255),
    type character varying(255)
);


--
-- Name: custom_views_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.custom_views_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: custom_views_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.custom_views_id_seq OWNED BY public.custom_views.id;


--
-- Name: device_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.device_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.devices (
    id bigint NOT NULL,
    user_id bigint,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    badge_no integer DEFAULT 0,
    token character varying(255),
    enabled boolean DEFAULT true,
    platform character varying(255),
    version character varying(255),
    player_id character varying(255),
    tester boolean
);


--
-- Name: devices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.devices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: devices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.devices_id_seq OWNED BY public.devices.id;


--
-- Name: event_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_invitations (
    id integer NOT NULL,
    user_id bigint,
    inviter_id bigint,
    event_id bigint,
    response character varying(255),
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: event_invitations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.event_invitations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: event_invitations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.event_invitations_id_seq OWNED BY public.event_invitations.id;


--
-- Name: event_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_responses (
    id integer NOT NULL,
    user_id bigint,
    post_id bigint,
    response character varying(255),
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: event_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.event_responses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: event_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.event_responses_id_seq OWNED BY public.event_responses.id;


--
-- Name: extensions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.extensions (
    id integer NOT NULL,
    type text,
    created_at timestamp with time zone
);


--
-- Name: extensions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.extensions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: extensions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.extensions_id_seq OWNED BY public.extensions.id;


--
-- Name: flagged_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flagged_items (
    id integer NOT NULL,
    user_id bigint,
    category character varying(255),
    reason text,
    link character varying(255),
    object_id bigint,
    object_type character varying(255)
);


--
-- Name: flagged_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.flagged_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: flagged_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.flagged_items_id_seq OWNED BY public.flagged_items.id;


--
-- Name: tag_follows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tag_follows (
    id integer NOT NULL,
    community_id bigint,
    tag_id bigint,
    user_id bigint,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    new_post_count integer DEFAULT 0,
    group_id bigint NOT NULL,
    last_read_post_id bigint
);


--
-- Name: followed_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.followed_tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: followed_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.followed_tags_id_seq OWNED BY public.tag_follows.id;


--
-- Name: follower_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.follower_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: follows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.follows (
    id bigint DEFAULT nextval('public.follower_seq'::regclass) NOT NULL,
    post_id bigint,
    added_at timestamp with time zone,
    user_id bigint,
    added_by_id bigint,
    role integer,
    comment_id bigint
);


--
-- Name: group_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_relationships (
    id bigint NOT NULL,
    parent_group_id bigint NOT NULL,
    child_group_id bigint NOT NULL,
    active boolean DEFAULT true,
    role integer,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: group_connections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.group_connections_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: group_connections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.group_connections_id_seq OWNED BY public.group_relationships.id;


--
-- Name: group_extensions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_extensions (
    id integer NOT NULL,
    group_id bigint NOT NULL,
    extension_id bigint NOT NULL,
    data jsonb,
    active boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: group_extensions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.group_extensions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: group_extensions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.group_extensions_id_seq OWNED BY public.group_extensions.id;


--
-- Name: group_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_invites (
    id bigint DEFAULT nextval('public.community_invite_seq'::regclass) NOT NULL,
    community_id bigint,
    created_at timestamp with time zone NOT NULL,
    invited_by_id bigint NOT NULL,
    used_by_id bigint,
    token text NOT NULL,
    used_at timestamp with time zone,
    email text NOT NULL,
    role smallint DEFAULT 0,
    tag_id bigint,
    last_sent_at timestamp with time zone,
    sent_count integer DEFAULT 0,
    subject character varying(255),
    message text,
    expired_by_id bigint,
    expired_at timestamp with time zone,
    group_id bigint NOT NULL
);


--
-- Name: group_join_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_join_questions (
    id integer NOT NULL,
    group_id bigint NOT NULL,
    question_id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: group_join_questions_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_join_questions_answers (
    id integer NOT NULL,
    question_id bigint NOT NULL,
    join_request_id bigint,
    answer text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    group_id bigint,
    user_id bigint
);


--
-- Name: group_join_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.group_join_questions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: group_join_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.group_join_questions_id_seq OWNED BY public.group_join_questions.id;


--
-- Name: group_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_memberships (
    id bigint NOT NULL,
    group_id bigint NOT NULL,
    user_id bigint NOT NULL,
    active boolean DEFAULT true,
    role integer,
    settings jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    new_post_count integer DEFAULT 0,
    group_data_type integer,
    project_role_id bigint
);


--
-- Name: group_memberships_common_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_memberships_common_roles (
    id integer NOT NULL,
    common_role_id bigint,
    user_id bigint,
    group_id bigint
);


--
-- Name: group_memberships_common_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.group_memberships_common_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: group_memberships_common_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.group_memberships_common_roles_id_seq OWNED BY public.group_memberships_common_roles.id;


--
-- Name: group_memberships_group_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_memberships_group_roles (
    id integer NOT NULL,
    group_id bigint NOT NULL,
    user_id bigint NOT NULL,
    group_role_id bigint NOT NULL,
    active boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: group_memberships_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.group_memberships_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: group_memberships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.group_memberships_id_seq OWNED BY public.group_memberships.id;


--
-- Name: group_relationship_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_relationship_invites (
    id integer NOT NULL,
    from_group_id bigint NOT NULL,
    to_group_id bigint NOT NULL,
    type integer NOT NULL,
    created_by_id bigint NOT NULL,
    created_at timestamp with time zone,
    status integer DEFAULT 0,
    processed_by_id bigint,
    processed_at timestamp with time zone,
    canceled_by_id bigint,
    canceled_at timestamp with time zone,
    sent_count integer,
    last_sent_at timestamp with time zone,
    subject text,
    message text,
    updated_at timestamp with time zone
);


--
-- Name: group_relationship_invites_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.group_relationship_invites_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: group_relationship_invites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.group_relationship_invites_id_seq OWNED BY public.group_relationship_invites.id;


--
-- Name: group_roles_responsibilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_roles_responsibilities (
    id integer NOT NULL,
    group_role_id bigint,
    responsibility_id bigint
);


--
-- Name: group_roles_responsibilities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.group_roles_responsibilities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: group_roles_responsibilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.group_roles_responsibilities_id_seq OWNED BY public.group_roles_responsibilities.id;


--
-- Name: group_to_group_join_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_to_group_join_questions (
    id integer NOT NULL,
    group_id bigint NOT NULL,
    question_id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: group_to_group_join_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.group_to_group_join_questions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: group_to_group_join_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.group_to_group_join_questions_id_seq OWNED BY public.group_to_group_join_questions.id;


--
-- Name: group_to_group_join_request_question_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_to_group_join_request_question_answers (
    id integer NOT NULL,
    question_id bigint NOT NULL,
    join_request_id bigint NOT NULL,
    answer text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: group_to_group_join_request_question_answers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.group_to_group_join_request_question_answers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: group_to_group_join_request_question_answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.group_to_group_join_request_question_answers_id_seq OWNED BY public.group_to_group_join_request_question_answers.id;


--
-- Name: group_widgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_widgets (
    id integer NOT NULL,
    group_id bigint NOT NULL,
    widget_id bigint NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb,
    is_visible boolean DEFAULT true,
    "order" integer,
    created_at timestamp with time zone,
    context character varying(255)
);


--
-- Name: group_widgets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.group_widgets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: group_widgets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.group_widgets_id_seq OWNED BY public.group_widgets.id;


--
-- Name: groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groups (
    id bigint NOT NULL,
    group_data_type integer NOT NULL,
    group_data_id bigint,
    active boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name character varying(255),
    slug character varying(255),
    description text,
    location character varying(255),
    location_id bigint,
    avatar_url character varying(255),
    banner_url character varying(255),
    visibility integer DEFAULT 1,
    accessibility integer DEFAULT 1,
    created_by_id bigint,
    access_code character varying(255),
    settings jsonb,
    num_members integer,
    slack_hook_url text,
    slack_team text,
    slack_configure_url text,
    type text,
    geo_shape public.geometry(Polygon,4326),
    type_descriptor character varying(255) DEFAULT NULL::character varying,
    type_descriptor_plural character varying(255) DEFAULT NULL::character varying,
    steward_descriptor character varying(255) DEFAULT NULL::character varying,
    steward_descriptor_plural character varying(255) DEFAULT NULL::character varying,
    about_video_uri character varying(255),
    allow_in_public boolean DEFAULT false,
    purpose text
);


--
-- Name: groups_agreements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groups_agreements (
    id integer NOT NULL,
    group_id bigint NOT NULL,
    agreement_id bigint NOT NULL,
    active boolean DEFAULT true,
    "order" integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: groups_agreements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.groups_agreements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: groups_agreements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.groups_agreements_id_seq OWNED BY public.groups_agreements.id;


--
-- Name: groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.groups_id_seq OWNED BY public.groups.id;


--
-- Name: groups_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groups_posts (
    post_id bigint NOT NULL,
    community_id bigint,
    id integer NOT NULL,
    pinned_at timestamp with time zone,
    group_id bigint NOT NULL
);


--
-- Name: groups_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groups_roles (
    id integer NOT NULL,
    group_id bigint,
    name character varying(255),
    emoji character varying(255),
    color character varying(255),
    active boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    description text
);


--
-- Name: groups_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.groups_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: groups_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.groups_roles_id_seq OWNED BY public.groups_roles.id;


--
-- Name: groups_suggested_skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groups_suggested_skills (
    id integer NOT NULL,
    group_id bigint NOT NULL,
    skill_id bigint NOT NULL,
    created_at timestamp with time zone
);


--
-- Name: groups_suggested_skills_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.groups_suggested_skills_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: groups_suggested_skills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.groups_suggested_skills_id_seq OWNED BY public.groups_suggested_skills.id;


--
-- Name: invite_request_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invite_request_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: join_request_question_answers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.join_request_question_answers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: join_request_question_answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.join_request_question_answers_id_seq OWNED BY public.group_join_questions_answers.id;


--
-- Name: join_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.join_requests (
    id integer NOT NULL,
    user_id bigint,
    community_id bigint,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    status integer,
    group_id bigint NOT NULL,
    processed_by_id bigint
);


--
-- Name: join_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.join_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: join_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.join_requests_id_seq OWNED BY public.join_requests.id;


--
-- Name: knex_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knex_migrations (
    id integer NOT NULL,
    name character varying(255),
    batch integer,
    migration_time timestamp with time zone
);


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.knex_migrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.knex_migrations_id_seq OWNED BY public.knex_migrations.id;


--
-- Name: knex_migrations_lock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knex_migrations_lock (
    is_locked integer
);


--
-- Name: link_previews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.link_previews (
    id integer NOT NULL,
    url text,
    done boolean DEFAULT false,
    title text,
    description text,
    image_url text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    image_width integer,
    image_height integer
);


--
-- Name: link_previews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.link_previews_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: link_previews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.link_previews_id_seq OWNED BY public.link_previews.id;


--
-- Name: linked_account_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.linked_account_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: linked_account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.linked_account (
    id bigint DEFAULT nextval('public.linked_account_seq'::regclass) NOT NULL,
    user_id bigint,
    provider_user_id character varying(255),
    provider_key character varying(255)
);


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id integer NOT NULL,
    center public.geometry(Point,4326),
    bbox public.geometry(Polygon,4326),
    geometry public.geometry(Polygon,4326),
    full_text character varying(255),
    address_number character varying(255),
    address_street character varying(255),
    city character varying(255),
    locality character varying(255),
    region character varying(255),
    neighborhood character varying(255),
    postcode character varying(255),
    country_code character varying(255),
    accuracy character varying(255),
    wikidata character varying(255),
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    country character varying(255)
);


--
-- Name: locations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.locations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.locations_id_seq OWNED BY public.locations.id;


--
-- Name: media_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.media_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media (
    id bigint DEFAULT nextval('public.media_seq'::regclass) NOT NULL,
    type character varying(255),
    url character varying(255),
    thumbnail_url character varying(255),
    created_at timestamp with time zone,
    post_id bigint,
    name character varying(255),
    width integer,
    height integer,
    comment_id bigint,
    "position" integer DEFAULT 0
);


--
-- Name: members_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.members_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: members_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.members_roles_id_seq OWNED BY public.group_memberships_group_roles.id;


--
-- Name: moderation_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moderation_actions (
    id integer NOT NULL,
    text text,
    reporter_id bigint NOT NULL,
    post_id bigint NOT NULL,
    group_id bigint,
    status text,
    anonymous text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: moderation_actions_agreements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moderation_actions_agreements (
    id integer NOT NULL,
    moderation_action_id bigint NOT NULL,
    agreement_id bigint NOT NULL
);


--
-- Name: moderation_actions_agreements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.moderation_actions_agreements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: moderation_actions_agreements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.moderation_actions_agreements_id_seq OWNED BY public.moderation_actions_agreements.id;


--
-- Name: moderation_actions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.moderation_actions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: moderation_actions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.moderation_actions_id_seq OWNED BY public.moderation_actions.id;


--
-- Name: moderation_actions_platform_agreements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moderation_actions_platform_agreements (
    id integer NOT NULL,
    moderation_action_id integer,
    platform_agreement_id integer
);


--
-- Name: moderation_actions_platform_agreements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.moderation_actions_platform_agreements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: moderation_actions_platform_agreements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.moderation_actions_platform_agreements_id_seq OWNED BY public.moderation_actions_platform_agreements.id;


--
-- Name: networks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.networks (
    id integer NOT NULL,
    name character varying(255),
    description text,
    avatar_url character varying(255),
    banner_url character varying(255),
    slug character varying(255),
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: networks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.networks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: networks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.networks_id_seq OWNED BY public.networks.id;


--
-- Name: networks_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.networks_posts (
    id integer NOT NULL,
    network_id bigint,
    post_id bigint
);


--
-- Name: networks_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.networks_posts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: networks_posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.networks_posts_id_seq OWNED BY public.networks_posts.id;


--
-- Name: networks_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.networks_users (
    id integer NOT NULL,
    network_id bigint,
    user_id bigint,
    role integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: networks_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.networks_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: networks_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.networks_users_id_seq OWNED BY public.networks_users.id;


--
-- Name: nexudus_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexudus_accounts (
    id integer NOT NULL,
    community_id bigint,
    space_id character varying(255),
    username character varying(255),
    password character varying(255),
    autoupdate boolean
);


--
-- Name: nexudus_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexudus_accounts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexudus_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexudus_accounts_id_seq OWNED BY public.nexudus_accounts.id;


--
-- Name: notification_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_status_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_status_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    activity_id bigint,
    sent_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    failed_at timestamp with time zone,
    medium integer,
    user_id bigint
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: oidc_payloads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oidc_payloads (
    id character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    payload jsonb,
    grant_id character varying(255),
    user_code character varying(255),
    uid character varying(255),
    expires_at timestamp with time zone,
    consumed_at timestamp with time zone
);


--
-- Name: org_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.org_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: platform_agreements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_agreements (
    id integer NOT NULL,
    text text
);


--
-- Name: platform_agreements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.platform_agreements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: platform_agreements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.platform_agreements_id_seq OWNED BY public.platform_agreements.id;


--
-- Name: post_community_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.post_community_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: post_community_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.post_community_id_seq OWNED BY public.groups_posts.id;


--
-- Name: post_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.post_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: post_view_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.post_view_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id bigint DEFAULT nextval('public.post_seq'::regclass) NOT NULL,
    name text,
    description text,
    type character varying(255),
    created_at timestamp with time zone,
    user_id bigint,
    num_people_reacts integer,
    num_comments integer,
    active boolean,
    deactivated_by_id bigint,
    deactivated_at timestamp with time zone,
    deactivated_reason character varying(255),
    fulfilled_at timestamp with time zone,
    updated_at timestamp with time zone,
    visibility integer DEFAULT 0,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    location character varying(255),
    created_from character varying(255),
    parent_post_id bigint,
    link_preview_id bigint,
    is_project_request boolean DEFAULT false,
    announcement boolean DEFAULT false,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    accept_contributions boolean DEFAULT false,
    location_id bigint,
    is_public boolean DEFAULT false,
    donations_link character varying(255),
    project_management_link character varying(255),
    reactions_summary jsonb,
    link_preview_featured boolean DEFAULT false,
    timezone character varying(255),
    quorum bigint,
    proposal_status text,
    proposal_outcome text,
    voting_method text,
    proposal_vote_limit integer,
    proposal_strict boolean DEFAULT false,
    anonymous_voting text,
    flagged_groups bigint[],
    edited_at timestamp with time zone
);


--
-- Name: posts_about_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts_about_users (
    post_id bigint,
    user_id bigint
);


--
-- Name: posts_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts_tags (
    id integer NOT NULL,
    post_id bigint,
    tag_id bigint,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    selected boolean
);


--
-- Name: posts_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.posts_tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: posts_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.posts_tags_id_seq OWNED BY public.posts_tags.id;


--
-- Name: posts_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts_users (
    id integer NOT NULL,
    user_id bigint,
    post_id bigint,
    last_read_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    project_role_id bigint,
    following boolean DEFAULT true,
    active boolean DEFAULT true,
    clickthrough boolean
);


--
-- Name: posts_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.posts_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: posts_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.posts_users_id_seq OWNED BY public.posts_users.id;


--
-- Name: project_contributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_contributions (
    id integer NOT NULL,
    user_id bigint,
    post_id bigint,
    amount integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: project_contributions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_contributions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_contributions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_contributions_id_seq OWNED BY public.project_contributions.id;


--
-- Name: project_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_roles (
    id bigint NOT NULL,
    name character varying(255),
    post_id bigint
);


--
-- Name: project_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_roles_id_seq OWNED BY public.project_roles.id;


--
-- Name: proposal_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proposal_options (
    id integer NOT NULL,
    post_id bigint NOT NULL,
    emoji text,
    color text,
    text text NOT NULL
);


--
-- Name: proposal_options_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proposal_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proposal_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proposal_options_id_seq OWNED BY public.proposal_options.id;


--
-- Name: proposal_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proposal_votes (
    id integer NOT NULL,
    post_id bigint NOT NULL,
    option_id bigint NOT NULL,
    user_id bigint NOT NULL,
    created_at timestamp with time zone
);


--
-- Name: proposal_votes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proposal_votes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proposal_votes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proposal_votes_id_seq OWNED BY public.proposal_votes.id;


--
-- Name: users_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint DEFAULT nextval('public.users_seq'::regclass) NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(255),
    avatar_url character varying(255),
    first_name character varying(255),
    last_name character varying(255),
    last_login_at timestamp with time zone,
    active boolean,
    email_validated boolean,
    created_at timestamp with time zone,
    date_deactivated timestamp with time zone,
    bio text,
    banner_url character varying(255),
    twitter_name character varying(255),
    linkedin_url character varying(255),
    facebook_url character varying(255),
    work text,
    intention text,
    extra_info text,
    new_notification_count integer DEFAULT 0,
    updated_at timestamp with time zone,
    settings jsonb DEFAULT '{}'::jsonb,
    location character varying(255),
    url character varying(255),
    tagline character varying(255),
    stripe_account_id bigint,
    location_id bigint,
    contact_email character varying(255),
    contact_phone character varying(255),
    last_active_at timestamp with time zone
);


--
-- Name: push_notification_testers; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.push_notification_testers AS
 SELECT u.id AS user_id,
    u.name,
    (u.settings -> 'dm_notifications'::text),
    d.id AS device_id,
    d.created_at,
    d.updated_at,
    d.player_id,
    d.platform,
    d.tester
   FROM (public.devices d
     LEFT JOIN public.users u ON ((u.id = d.user_id)))
  WHERE (d.player_id IS NOT NULL)
  ORDER BY d.created_at;


--
-- Name: push_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_notifications (
    id integer NOT NULL,
    queued_at timestamp with time zone,
    sent_at timestamp with time zone,
    alert character varying(255) DEFAULT ''::character varying,
    badge_no integer DEFAULT 0,
    platform character varying(255),
    path character varying(255),
    disabled boolean,
    device_id bigint
);


--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    id integer NOT NULL,
    text text,
    created_at timestamp with time zone
);


--
-- Name: questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.questions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.questions_id_seq OWNED BY public.questions.id;


--
-- Name: queued_pushes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.queued_pushes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: queued_pushes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.queued_pushes_id_seq OWNED BY public.push_notifications.id;


--
-- Name: vote_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vote_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reactions (
    id bigint DEFAULT nextval('public.vote_seq'::regclass) NOT NULL,
    user_id bigint,
    entity_id bigint,
    date_reacted timestamp with time zone,
    emoji_base text,
    emoji_full text,
    emoji_label text,
    entity_type text
);


--
-- Name: responsibilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.responsibilities (
    id integer NOT NULL,
    title text NOT NULL,
    description text,
    type text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    group_id bigint
);


--
-- Name: responsibilities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.responsibilities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: responsibilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.responsibilities_id_seq OWNED BY public.responsibilities.id;


--
-- Name: saved_search_topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_search_topics (
    id integer NOT NULL,
    tag_id bigint NOT NULL,
    saved_search_id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: saved_search_topics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.saved_search_topics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: saved_search_topics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.saved_search_topics_id_seq OWNED BY public.saved_search_topics.id;


--
-- Name: saved_searches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_searches (
    id integer NOT NULL,
    user_id bigint NOT NULL,
    name character varying(255),
    context character varying(255) NOT NULL,
    group_id bigint,
    is_active boolean DEFAULT true,
    search_text character varying(255),
    post_types character varying(255)[],
    bounding_box public.geometry(Polygon,4326),
    last_post_id bigint,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: COLUMN saved_searches.group_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.saved_searches.group_id IS 'If context is "community" or "network", this represents the community or network id';


--
-- Name: saved_searches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.saved_searches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: saved_searches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.saved_searches_id_seq OWNED BY public.saved_searches.id;


--
-- Name: security_role_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.security_role_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skill_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skill_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skills (
    id integer NOT NULL,
    name character varying(255)
);


--
-- Name: skills_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skills_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skills_id_seq OWNED BY public.skills.id;


--
-- Name: skills_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skills_users (
    id integer NOT NULL,
    skill_id bigint,
    user_id bigint,
    type integer DEFAULT 0
);


--
-- Name: skills_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skills_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skills_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skills_users_id_seq OWNED BY public.skills_users.id;


--
-- Name: stripe_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_accounts (
    id bigint NOT NULL,
    stripe_account_external_id character varying(255),
    refresh_token character varying(255)
);


--
-- Name: stripe_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stripe_accounts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stripe_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stripe_accounts_id_seq OWNED BY public.stripe_accounts.id;


--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tags (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tags_id_seq OWNED BY public.tags.id;


--
-- Name: thank_you_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.thank_you_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: thanks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thanks (
    id bigint DEFAULT nextval('public.thank_you_seq'::regclass) NOT NULL,
    comment_id bigint NOT NULL,
    date_thanked timestamp with time zone NOT NULL,
    user_id bigint NOT NULL,
    thanked_by_id bigint NOT NULL
);


--
-- Name: token_action_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.token_action_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_affiliations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_affiliations (
    id integer NOT NULL,
    user_id bigint NOT NULL,
    role character varying(255),
    preposition character varying(255),
    org_name character varying(255),
    url character varying(255),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: user_affiliations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_affiliations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_affiliations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_affiliations_id_seq OWNED BY public.user_affiliations.id;


--
-- Name: user_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_connections (
    id integer NOT NULL,
    user_id bigint,
    other_user_id bigint,
    type character varying(255),
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: user_connections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_connections_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_connections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_connections_id_seq OWNED BY public.user_connections.id;


--
-- Name: user_external_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_external_data (
    id bigint NOT NULL,
    user_id bigint,
    type character varying(255),
    data jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: user_external_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_external_data_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_external_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_external_data_id_seq OWNED BY public.user_external_data.id;


--
-- Name: user_permission_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_permission_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_post_relevance_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_post_relevance_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_post_relevance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_post_relevance (
    id bigint DEFAULT nextval('public.user_post_relevance_seq'::regclass) NOT NULL,
    user_id bigint,
    post_id bigint,
    similarity real,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: user_verification_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_verification_codes (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    code character varying(6) NOT NULL,
    created_at timestamp with time zone
);


--
-- Name: user_verification_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_verification_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_verification_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_verification_codes_id_seq OWNED BY public.user_verification_codes.id;


--
-- Name: users_community_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_community_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_community_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_community_id_seq OWNED BY public.communities_users.id;


--
-- Name: users_groups_agreements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users_groups_agreements (
    id integer NOT NULL,
    group_id bigint NOT NULL,
    agreement_id bigint NOT NULL,
    user_id bigint NOT NULL,
    accepted boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: users_groups_agreements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_groups_agreements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_groups_agreements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_groups_agreements_id_seq OWNED BY public.users_groups_agreements.id;


--
-- Name: votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.votes (
);


--
-- Name: widgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.widgets (
    id integer NOT NULL,
    name character varying(255),
    created_at timestamp with time zone
);


--
-- Name: widgets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.widgets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: widgets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.widgets_id_seq OWNED BY public.widgets.id;


--
-- Name: zapier_triggers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zapier_triggers (
    id integer NOT NULL,
    user_id bigint,
    is_active boolean DEFAULT true,
    type character varying(255) NOT NULL,
    target_url character varying(255) NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    params jsonb
);


--
-- Name: zapier_triggers_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zapier_triggers_groups (
    id integer NOT NULL,
    zapier_trigger_id bigint,
    group_id bigint
);


--
-- Name: zapier_triggers_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.zapier_triggers_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: zapier_triggers_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.zapier_triggers_groups_id_seq OWNED BY public.zapier_triggers_groups.id;


--
-- Name: zapier_triggers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.zapier_triggers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: zapier_triggers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.zapier_triggers_id_seq OWNED BY public.zapier_triggers.id;


--
-- Name: activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities ALTER COLUMN id SET DEFAULT nextval('public.activity_id_seq'::regclass);


--
-- Name: agreements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agreements ALTER COLUMN id SET DEFAULT nextval('public.agreements_id_seq'::regclass);


--
-- Name: blocked_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_users ALTER COLUMN id SET DEFAULT nextval('public.blocked_users_id_seq'::regclass);


--
-- Name: collections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections ALTER COLUMN id SET DEFAULT nextval('public.collections_id_seq'::regclass);


--
-- Name: collections_posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections_posts ALTER COLUMN id SET DEFAULT nextval('public.collections_posts_id_seq'::regclass);


--
-- Name: comments_tags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments_tags ALTER COLUMN id SET DEFAULT nextval('public.comments_tags_id_seq'::regclass);


--
-- Name: common_roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.common_roles ALTER COLUMN id SET DEFAULT nextval('public.common_roles_id_seq'::regclass);


--
-- Name: common_roles_responsibilities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.common_roles_responsibilities ALTER COLUMN id SET DEFAULT nextval('public.common_roles_responsibilities_id_seq'::regclass);


--
-- Name: communities_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities_users ALTER COLUMN id SET DEFAULT nextval('public.users_community_id_seq'::regclass);


--
-- Name: custom_view_topics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_view_topics ALTER COLUMN id SET DEFAULT nextval('public.custom_view_topics_id_seq'::regclass);


--
-- Name: custom_views id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_views ALTER COLUMN id SET DEFAULT nextval('public.custom_views_id_seq'::regclass);


--
-- Name: devices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices ALTER COLUMN id SET DEFAULT nextval('public.devices_id_seq'::regclass);


--
-- Name: event_invitations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_invitations ALTER COLUMN id SET DEFAULT nextval('public.event_invitations_id_seq'::regclass);


--
-- Name: event_responses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_responses ALTER COLUMN id SET DEFAULT nextval('public.event_responses_id_seq'::regclass);


--
-- Name: extensions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extensions ALTER COLUMN id SET DEFAULT nextval('public.extensions_id_seq'::regclass);


--
-- Name: flagged_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flagged_items ALTER COLUMN id SET DEFAULT nextval('public.flagged_items_id_seq'::regclass);


--
-- Name: group_extensions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_extensions ALTER COLUMN id SET DEFAULT nextval('public.group_extensions_id_seq'::regclass);


--
-- Name: group_join_questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_join_questions ALTER COLUMN id SET DEFAULT nextval('public.group_join_questions_id_seq'::regclass);


--
-- Name: group_join_questions_answers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_join_questions_answers ALTER COLUMN id SET DEFAULT nextval('public.join_request_question_answers_id_seq'::regclass);


--
-- Name: group_memberships id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships ALTER COLUMN id SET DEFAULT nextval('public.group_memberships_id_seq'::regclass);


--
-- Name: group_memberships_common_roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships_common_roles ALTER COLUMN id SET DEFAULT nextval('public.group_memberships_common_roles_id_seq'::regclass);


--
-- Name: group_memberships_group_roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships_group_roles ALTER COLUMN id SET DEFAULT nextval('public.members_roles_id_seq'::regclass);


--
-- Name: group_relationship_invites id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_relationship_invites ALTER COLUMN id SET DEFAULT nextval('public.group_relationship_invites_id_seq'::regclass);


--
-- Name: group_relationships id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_relationships ALTER COLUMN id SET DEFAULT nextval('public.group_connections_id_seq'::regclass);


--
-- Name: group_roles_responsibilities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_roles_responsibilities ALTER COLUMN id SET DEFAULT nextval('public.group_roles_responsibilities_id_seq'::regclass);


--
-- Name: group_to_group_join_questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_to_group_join_questions ALTER COLUMN id SET DEFAULT nextval('public.group_to_group_join_questions_id_seq'::regclass);


--
-- Name: group_to_group_join_request_question_answers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_to_group_join_request_question_answers ALTER COLUMN id SET DEFAULT nextval('public.group_to_group_join_request_question_answers_id_seq'::regclass);


--
-- Name: group_widgets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_widgets ALTER COLUMN id SET DEFAULT nextval('public.group_widgets_id_seq'::regclass);


--
-- Name: groups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups ALTER COLUMN id SET DEFAULT nextval('public.groups_id_seq'::regclass);


--
-- Name: groups_agreements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_agreements ALTER COLUMN id SET DEFAULT nextval('public.groups_agreements_id_seq'::regclass);


--
-- Name: groups_posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_posts ALTER COLUMN id SET DEFAULT nextval('public.post_community_id_seq'::regclass);


--
-- Name: groups_roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_roles ALTER COLUMN id SET DEFAULT nextval('public.groups_roles_id_seq'::regclass);


--
-- Name: groups_suggested_skills id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_suggested_skills ALTER COLUMN id SET DEFAULT nextval('public.groups_suggested_skills_id_seq'::regclass);


--
-- Name: groups_tags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_tags ALTER COLUMN id SET DEFAULT nextval('public.communities_tags_id_seq'::regclass);


--
-- Name: join_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.join_requests ALTER COLUMN id SET DEFAULT nextval('public.join_requests_id_seq'::regclass);


--
-- Name: knex_migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knex_migrations ALTER COLUMN id SET DEFAULT nextval('public.knex_migrations_id_seq'::regclass);


--
-- Name: link_previews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.link_previews ALTER COLUMN id SET DEFAULT nextval('public.link_previews_id_seq'::regclass);


--
-- Name: locations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations ALTER COLUMN id SET DEFAULT nextval('public.locations_id_seq'::regclass);


--
-- Name: moderation_actions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_actions ALTER COLUMN id SET DEFAULT nextval('public.moderation_actions_id_seq'::regclass);


--
-- Name: moderation_actions_agreements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_actions_agreements ALTER COLUMN id SET DEFAULT nextval('public.moderation_actions_agreements_id_seq'::regclass);


--
-- Name: moderation_actions_platform_agreements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_actions_platform_agreements ALTER COLUMN id SET DEFAULT nextval('public.moderation_actions_platform_agreements_id_seq'::regclass);


--
-- Name: networks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networks ALTER COLUMN id SET DEFAULT nextval('public.networks_id_seq'::regclass);


--
-- Name: networks_posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networks_posts ALTER COLUMN id SET DEFAULT nextval('public.networks_posts_id_seq'::regclass);


--
-- Name: networks_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networks_users ALTER COLUMN id SET DEFAULT nextval('public.networks_users_id_seq'::regclass);


--
-- Name: nexudus_accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexudus_accounts ALTER COLUMN id SET DEFAULT nextval('public.nexudus_accounts_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: platform_agreements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_agreements ALTER COLUMN id SET DEFAULT nextval('public.platform_agreements_id_seq'::regclass);


--
-- Name: posts_tags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts_tags ALTER COLUMN id SET DEFAULT nextval('public.posts_tags_id_seq'::regclass);


--
-- Name: posts_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts_users ALTER COLUMN id SET DEFAULT nextval('public.posts_users_id_seq'::regclass);


--
-- Name: project_contributions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_contributions ALTER COLUMN id SET DEFAULT nextval('public.project_contributions_id_seq'::regclass);


--
-- Name: project_roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_roles ALTER COLUMN id SET DEFAULT nextval('public.project_roles_id_seq'::regclass);


--
-- Name: proposal_options id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_options ALTER COLUMN id SET DEFAULT nextval('public.proposal_options_id_seq'::regclass);


--
-- Name: proposal_votes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_votes ALTER COLUMN id SET DEFAULT nextval('public.proposal_votes_id_seq'::regclass);


--
-- Name: push_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_notifications ALTER COLUMN id SET DEFAULT nextval('public.queued_pushes_id_seq'::regclass);


--
-- Name: questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions ALTER COLUMN id SET DEFAULT nextval('public.questions_id_seq'::regclass);


--
-- Name: responsibilities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responsibilities ALTER COLUMN id SET DEFAULT nextval('public.responsibilities_id_seq'::regclass);


--
-- Name: saved_search_topics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_search_topics ALTER COLUMN id SET DEFAULT nextval('public.saved_search_topics_id_seq'::regclass);


--
-- Name: saved_searches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_searches ALTER COLUMN id SET DEFAULT nextval('public.saved_searches_id_seq'::regclass);


--
-- Name: skills id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills ALTER COLUMN id SET DEFAULT nextval('public.skills_id_seq'::regclass);


--
-- Name: skills_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills_users ALTER COLUMN id SET DEFAULT nextval('public.skills_users_id_seq'::regclass);


--
-- Name: stripe_accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_accounts ALTER COLUMN id SET DEFAULT nextval('public.stripe_accounts_id_seq'::regclass);


--
-- Name: tag_follows id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_follows ALTER COLUMN id SET DEFAULT nextval('public.followed_tags_id_seq'::regclass);


--
-- Name: tags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags ALTER COLUMN id SET DEFAULT nextval('public.tags_id_seq'::regclass);


--
-- Name: user_affiliations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_affiliations ALTER COLUMN id SET DEFAULT nextval('public.user_affiliations_id_seq'::regclass);


--
-- Name: user_connections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_connections ALTER COLUMN id SET DEFAULT nextval('public.user_connections_id_seq'::regclass);


--
-- Name: user_external_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_external_data ALTER COLUMN id SET DEFAULT nextval('public.user_external_data_id_seq'::regclass);


--
-- Name: user_verification_codes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_verification_codes ALTER COLUMN id SET DEFAULT nextval('public.user_verification_codes_id_seq'::regclass);


--
-- Name: users_groups_agreements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_groups_agreements ALTER COLUMN id SET DEFAULT nextval('public.users_groups_agreements_id_seq'::regclass);


--
-- Name: widgets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.widgets ALTER COLUMN id SET DEFAULT nextval('public.widgets_id_seq'::regclass);


--
-- Name: zapier_triggers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zapier_triggers ALTER COLUMN id SET DEFAULT nextval('public.zapier_triggers_id_seq'::regclass);


--
-- Name: zapier_triggers_groups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zapier_triggers_groups ALTER COLUMN id SET DEFAULT nextval('public.zapier_triggers_groups_id_seq'::regclass);


--
-- Name: users pk_users; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT pk_users PRIMARY KEY (id);


--
-- Name: search_index; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.search_index AS
 SELECT p.id AS post_id,
    NULL::bigint AS user_id,
    NULL::bigint AS comment_id,
    ((setweight(to_tsvector('english'::regconfig, p.name), 'B'::"char") || setweight(to_tsvector('english'::regconfig, COALESCE(p.description, ''::text)), 'C'::"char")) || setweight(to_tsvector('english'::regconfig, (u.name)::text), 'D'::"char")) AS document
   FROM (public.posts p
     JOIN public.users u ON ((u.id = p.user_id)))
  WHERE ((p.active = true) AND (u.active = true))
UNION
 SELECT NULL::bigint AS post_id,
    u.id AS user_id,
    NULL::bigint AS comment_id,
    ((setweight(to_tsvector('english'::regconfig, (u.name)::text), 'A'::"char") || setweight(to_tsvector('english'::regconfig, COALESCE(string_agg(replace((s.name)::text, '-'::text, ' '::text), ' '::text), ''::text)), 'C'::"char")) || setweight(to_tsvector('english'::regconfig, COALESCE(u.bio, ''::text)), 'C'::"char")) AS document
   FROM ((public.users u
     LEFT JOIN public.skills_users su ON ((u.id = su.user_id)))
     LEFT JOIN public.skills s ON ((su.skill_id = s.id)))
  WHERE (u.active = true)
  GROUP BY u.id
UNION
 SELECT NULL::bigint AS post_id,
    NULL::bigint AS user_id,
    c.id AS comment_id,
    (setweight(to_tsvector('english'::regconfig, c.text), 'C'::"char") || setweight(to_tsvector('english'::regconfig, (u.name)::text), 'D'::"char")) AS document
   FROM (public.comments c
     JOIN public.users u ON ((u.id = c.user_id)))
  WHERE ((c.active = true) AND (u.active = true))
  WITH NO DATA;


--
-- Name: activities activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activity_pkey PRIMARY KEY (id);


--
-- Name: agreements agreements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agreements
    ADD CONSTRAINT agreements_pkey PRIMARY KEY (id);


--
-- Name: blocked_users blocked_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_pkey PRIMARY KEY (id);


--
-- Name: collections collections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_pkey PRIMARY KEY (id);


--
-- Name: collections_posts collections_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections_posts
    ADD CONSTRAINT collections_posts_pkey PRIMARY KEY (id);


--
-- Name: comments_tags comments_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments_tags
    ADD CONSTRAINT comments_tags_pkey PRIMARY KEY (id);


--
-- Name: common_roles common_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.common_roles
    ADD CONSTRAINT common_roles_pkey PRIMARY KEY (id);


--
-- Name: common_roles_responsibilities common_roles_responsibilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.common_roles_responsibilities
    ADD CONSTRAINT common_roles_responsibilities_pkey PRIMARY KEY (id);


--
-- Name: groups_tags communities_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_tags
    ADD CONSTRAINT communities_tags_pkey PRIMARY KEY (id);


--
-- Name: custom_view_topics custom_view_topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_view_topics
    ADD CONSTRAINT custom_view_topics_pkey PRIMARY KEY (id);


--
-- Name: custom_views custom_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_views
    ADD CONSTRAINT custom_views_pkey PRIMARY KEY (id);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: event_invitations event_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_invitations
    ADD CONSTRAINT event_invitations_pkey PRIMARY KEY (id);


--
-- Name: event_responses event_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_responses
    ADD CONSTRAINT event_responses_pkey PRIMARY KEY (id);


--
-- Name: event_responses event_responses_user_id_post_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_responses
    ADD CONSTRAINT event_responses_user_id_post_id_unique UNIQUE (user_id, post_id);


--
-- Name: extensions extensions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extensions
    ADD CONSTRAINT extensions_pkey PRIMARY KEY (id);


--
-- Name: flagged_items flagged_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flagged_items
    ADD CONSTRAINT flagged_items_pkey PRIMARY KEY (id);


--
-- Name: tag_follows followed_tags_community_id_tag_id_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_follows
    ADD CONSTRAINT followed_tags_community_id_tag_id_user_id_unique UNIQUE (community_id, tag_id, user_id);


--
-- Name: tag_follows followed_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_follows
    ADD CONSTRAINT followed_tags_pkey PRIMARY KEY (id);


--
-- Name: group_relationships group_connections_parent_group_id_child_group_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_relationships
    ADD CONSTRAINT group_connections_parent_group_id_child_group_id_unique UNIQUE (parent_group_id, child_group_id);


--
-- Name: group_relationships group_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_relationships
    ADD CONSTRAINT group_connections_pkey PRIMARY KEY (id);


--
-- Name: group_extensions group_extensions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_extensions
    ADD CONSTRAINT group_extensions_pkey PRIMARY KEY (id);


--
-- Name: group_join_questions group_join_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_join_questions
    ADD CONSTRAINT group_join_questions_pkey PRIMARY KEY (id);


--
-- Name: group_memberships_common_roles group_memberships_common_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships_common_roles
    ADD CONSTRAINT group_memberships_common_roles_pkey PRIMARY KEY (id);


--
-- Name: group_memberships group_memberships_group_id_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships
    ADD CONSTRAINT group_memberships_group_id_user_id_unique UNIQUE (group_id, user_id);


--
-- Name: group_memberships group_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships
    ADD CONSTRAINT group_memberships_pkey PRIMARY KEY (id);


--
-- Name: group_relationship_invites group_relationship_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_relationship_invites
    ADD CONSTRAINT group_relationship_invites_pkey PRIMARY KEY (id);


--
-- Name: group_roles_responsibilities group_roles_responsibilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_roles_responsibilities
    ADD CONSTRAINT group_roles_responsibilities_pkey PRIMARY KEY (id);


--
-- Name: group_to_group_join_questions group_to_group_join_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_to_group_join_questions
    ADD CONSTRAINT group_to_group_join_questions_pkey PRIMARY KEY (id);


--
-- Name: group_to_group_join_request_question_answers group_to_group_join_request_question_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_to_group_join_request_question_answers
    ADD CONSTRAINT group_to_group_join_request_question_answers_pkey PRIMARY KEY (id);


--
-- Name: group_widgets group_widgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_widgets
    ADD CONSTRAINT group_widgets_pkey PRIMARY KEY (id);


--
-- Name: groups groups_access_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_access_code_unique UNIQUE (access_code);


--
-- Name: groups_agreements groups_agreements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_agreements
    ADD CONSTRAINT groups_agreements_pkey PRIMARY KEY (id);


--
-- Name: groups groups_group_data_id_group_data_type_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_group_data_id_group_data_type_unique UNIQUE (group_data_id, group_data_type);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: groups_posts groups_posts_group_id_post_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_posts
    ADD CONSTRAINT groups_posts_group_id_post_id_unique UNIQUE (group_id, post_id);


--
-- Name: groups_roles groups_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_roles
    ADD CONSTRAINT groups_roles_pkey PRIMARY KEY (id);


--
-- Name: groups groups_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_slug_unique UNIQUE (slug);


--
-- Name: groups_suggested_skills groups_suggested_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_suggested_skills
    ADD CONSTRAINT groups_suggested_skills_pkey PRIMARY KEY (id);


--
-- Name: groups_tags groups_tags_group_id_tag_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_tags
    ADD CONSTRAINT groups_tags_group_id_tag_id_unique UNIQUE (group_id, tag_id);


--
-- Name: group_join_questions_answers join_request_question_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_join_questions_answers
    ADD CONSTRAINT join_request_question_answers_pkey PRIMARY KEY (id);


--
-- Name: join_requests join_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.join_requests
    ADD CONSTRAINT join_requests_pkey PRIMARY KEY (id);


--
-- Name: knex_migrations knex_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knex_migrations
    ADD CONSTRAINT knex_migrations_pkey PRIMARY KEY (id);


--
-- Name: link_previews link_previews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.link_previews
    ADD CONSTRAINT link_previews_pkey PRIMARY KEY (id);


--
-- Name: link_previews link_previews_url_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.link_previews
    ADD CONSTRAINT link_previews_url_unique UNIQUE (url);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: group_memberships_group_roles members_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships_group_roles
    ADD CONSTRAINT members_roles_pkey PRIMARY KEY (id);


--
-- Name: moderation_actions_agreements moderation_actions_agreements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_actions_agreements
    ADD CONSTRAINT moderation_actions_agreements_pkey PRIMARY KEY (id);


--
-- Name: moderation_actions moderation_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_actions
    ADD CONSTRAINT moderation_actions_pkey PRIMARY KEY (id);


--
-- Name: moderation_actions_platform_agreements moderation_actions_platform_agreements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_actions_platform_agreements
    ADD CONSTRAINT moderation_actions_platform_agreements_pkey PRIMARY KEY (id);


--
-- Name: networks_posts network_id_post_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networks_posts
    ADD CONSTRAINT network_id_post_id_key UNIQUE (network_id, post_id);


--
-- Name: networks networks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networks
    ADD CONSTRAINT networks_pkey PRIMARY KEY (id);


--
-- Name: networks_posts networks_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networks_posts
    ADD CONSTRAINT networks_posts_pkey PRIMARY KEY (id);


--
-- Name: networks networks_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networks
    ADD CONSTRAINT networks_slug_unique UNIQUE (slug);


--
-- Name: networks_users networks_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networks_users
    ADD CONSTRAINT networks_users_pkey PRIMARY KEY (id);


--
-- Name: nexudus_accounts nexudus_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexudus_accounts
    ADD CONSTRAINT nexudus_accounts_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: oidc_payloads oidc_payloads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oidc_payloads
    ADD CONSTRAINT oidc_payloads_pkey PRIMARY KEY (id, type);


--
-- Name: comments pk_comment; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT pk_comment PRIMARY KEY (id);


--
-- Name: communities pk_community; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT pk_community PRIMARY KEY (id);


--
-- Name: group_invites pk_community_invite; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invites
    ADD CONSTRAINT pk_community_invite PRIMARY KEY (id);


--
-- Name: contributions pk_contributor; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT pk_contributor PRIMARY KEY (id);


--
-- Name: follows pk_follower; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT pk_follower PRIMARY KEY (id);


--
-- Name: linked_account pk_linked_account; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linked_account
    ADD CONSTRAINT pk_linked_account PRIMARY KEY (id);


--
-- Name: media pk_media; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT pk_media PRIMARY KEY (id);


--
-- Name: posts pk_post; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT pk_post PRIMARY KEY (id);


--
-- Name: thanks pk_thank_you; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thanks
    ADD CONSTRAINT pk_thank_you PRIMARY KEY (id);


--
-- Name: user_post_relevance pk_user_post_relevance; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_post_relevance
    ADD CONSTRAINT pk_user_post_relevance PRIMARY KEY (id);


--
-- Name: reactions pk_vote; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT pk_vote PRIMARY KEY (id);


--
-- Name: platform_agreements platform_agreements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_agreements
    ADD CONSTRAINT platform_agreements_pkey PRIMARY KEY (id);


--
-- Name: groups_posts post_community_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_posts
    ADD CONSTRAINT post_community_pkey PRIMARY KEY (id);


--
-- Name: groups_posts post_community_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_posts
    ADD CONSTRAINT post_community_unique UNIQUE (post_id, community_id);


--
-- Name: posts_tags posts_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts_tags
    ADD CONSTRAINT posts_tags_pkey PRIMARY KEY (id);


--
-- Name: posts_users posts_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts_users
    ADD CONSTRAINT posts_users_pkey PRIMARY KEY (id);


--
-- Name: posts_users posts_users_post_id_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts_users
    ADD CONSTRAINT posts_users_post_id_user_id_unique UNIQUE (post_id, user_id);


--
-- Name: project_contributions project_contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_contributions
    ADD CONSTRAINT project_contributions_pkey PRIMARY KEY (id);


--
-- Name: project_roles project_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_roles
    ADD CONSTRAINT project_roles_pkey PRIMARY KEY (id);


--
-- Name: proposal_options proposal_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_options
    ADD CONSTRAINT proposal_options_pkey PRIMARY KEY (id);


--
-- Name: proposal_votes proposal_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_votes
    ADD CONSTRAINT proposal_votes_pkey PRIMARY KEY (id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: push_notifications queued_pushes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_notifications
    ADD CONSTRAINT queued_pushes_pkey PRIMARY KEY (id);


--
-- Name: responsibilities responsibilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responsibilities
    ADD CONSTRAINT responsibilities_pkey PRIMARY KEY (id);


--
-- Name: saved_search_topics saved_search_topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_search_topics
    ADD CONSTRAINT saved_search_topics_pkey PRIMARY KEY (id);


--
-- Name: saved_searches saved_searches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_searches
    ADD CONSTRAINT saved_searches_pkey PRIMARY KEY (id);


--
-- Name: skills skills_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_name_unique UNIQUE (name);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);


--
-- Name: skills_users skills_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills_users
    ADD CONSTRAINT skills_users_pkey PRIMARY KEY (id);


--
-- Name: skills_users skills_users_skill_id_user_id_type_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills_users
    ADD CONSTRAINT skills_users_skill_id_user_id_type_unique UNIQUE (skill_id, user_id, type);


--
-- Name: stripe_accounts stripe_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_accounts
    ADD CONSTRAINT stripe_accounts_pkey PRIMARY KEY (id);


--
-- Name: tag_follows tag_follows_group_id_tag_id_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_follows
    ADD CONSTRAINT tag_follows_group_id_tag_id_user_id_unique UNIQUE (group_id, tag_id, user_id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: communities unique_beta_access_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT unique_beta_access_code UNIQUE (beta_access_code);


--
-- Name: comments_tags unique_comments_tags; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments_tags
    ADD CONSTRAINT unique_comments_tags UNIQUE (comment_id, tag_id);


--
-- Name: groups_tags unique_communities_tags; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_tags
    ADD CONSTRAINT unique_communities_tags UNIQUE (community_id, tag_id);


--
-- Name: users unique_email; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT unique_email UNIQUE (email);


--
-- Name: follows unique_follows; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT unique_follows UNIQUE (post_id, comment_id, user_id);


--
-- Name: join_requests unique_join_requests; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.join_requests
    ADD CONSTRAINT unique_join_requests UNIQUE (user_id, community_id);


--
-- Name: tags unique_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT unique_name UNIQUE (name);


--
-- Name: posts_tags unique_posts_tags; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts_tags
    ADD CONSTRAINT unique_posts_tags UNIQUE (post_id, tag_id);


--
-- Name: communities uq_community_1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT uq_community_1 UNIQUE (name);


--
-- Name: communities uq_community_2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT uq_community_2 UNIQUE (slug);


--
-- Name: contributions uq_no_multiple_contributor_2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT uq_no_multiple_contributor_2 UNIQUE (post_id, user_id);


--
-- Name: thanks uq_no_multiple_thankyous_2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thanks
    ADD CONSTRAINT uq_no_multiple_thankyous_2 UNIQUE (comment_id, user_id, thanked_by_id);


--
-- Name: group_invites uq_no_multiple_tokens; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invites
    ADD CONSTRAINT uq_no_multiple_tokens UNIQUE (token);


--
-- Name: user_affiliations user_affiliations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_affiliations
    ADD CONSTRAINT user_affiliations_pkey PRIMARY KEY (id);


--
-- Name: communities_users user_community_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities_users
    ADD CONSTRAINT user_community_unique UNIQUE (user_id, community_id);


--
-- Name: user_connections user_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_connections
    ADD CONSTRAINT user_connections_pkey PRIMARY KEY (id);


--
-- Name: user_external_data user_external_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_external_data
    ADD CONSTRAINT user_external_data_pkey PRIMARY KEY (id);


--
-- Name: user_post_relevance user_id_post_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_post_relevance
    ADD CONSTRAINT user_id_post_id_unique UNIQUE (user_id, post_id);


--
-- Name: user_verification_codes user_verification_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_verification_codes
    ADD CONSTRAINT user_verification_codes_pkey PRIMARY KEY (id);


--
-- Name: communities_users users_community_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities_users
    ADD CONSTRAINT users_community_pkey PRIMARY KEY (id);


--
-- Name: users_groups_agreements users_groups_agreements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_groups_agreements
    ADD CONSTRAINT users_groups_agreements_pkey PRIMARY KEY (id);


--
-- Name: widgets widgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.widgets
    ADD CONSTRAINT widgets_pkey PRIMARY KEY (id);


--
-- Name: zapier_triggers_groups zapier_triggers_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zapier_triggers_groups
    ADD CONSTRAINT zapier_triggers_groups_pkey PRIMARY KEY (id);


--
-- Name: zapier_triggers zapier_triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zapier_triggers
    ADD CONSTRAINT zapier_triggers_pkey PRIMARY KEY (id);


--
-- Name: communities_tags_community_id_visibility_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX communities_tags_community_id_visibility_index ON public.groups_tags USING btree (community_id, visibility);


--
-- Name: fk_community_created_by_1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fk_community_created_by_1 ON public.communities USING btree (created_by_id);


--
-- Name: group_extensions_groups_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX group_extensions_groups_id_index ON public.group_extensions USING btree (group_id);


--
-- Name: group_invites_email_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX group_invites_email_index ON public.group_invites USING btree (email);


--
-- Name: group_invites_group_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX group_invites_group_id_index ON public.group_invites USING btree (group_id);


--
-- Name: group_join_questions_group_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX group_join_questions_group_id_index ON public.group_join_questions USING btree (group_id);


--
-- Name: group_memberships_common_roles_group_id_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX group_memberships_common_roles_group_id_user_id_index ON public.group_memberships_common_roles USING btree (group_id, user_id);


--
-- Name: group_relationship_invites_from_group_id_to_group_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX group_relationship_invites_from_group_id_to_group_id_index ON public.group_relationship_invites USING btree (from_group_id, to_group_id);


--
-- Name: group_to_group_join_questions_group_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX group_to_group_join_questions_group_id_index ON public.group_to_group_join_questions USING btree (group_id);


--
-- Name: group_to_group_join_request_question_answers_join_request_id_in; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX group_to_group_join_request_question_answers_join_request_id_in ON public.group_to_group_join_request_question_answers USING btree (join_request_id);


--
-- Name: group_widgets_group_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX group_widgets_group_id_index ON public.group_widgets USING btree (group_id);


--
-- Name: groups_roles_group_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX groups_roles_group_id_index ON public.groups_roles USING btree (group_id);


--
-- Name: groups_suggested_skills_group_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX groups_suggested_skills_group_id_index ON public.groups_suggested_skills USING btree (group_id);


--
-- Name: groups_tags_group_id_visibility_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX groups_tags_group_id_visibility_index ON public.groups_tags USING btree (group_id, visibility);


--
-- Name: groups_visibility_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX groups_visibility_index ON public.groups USING btree (visibility);


--
-- Name: idx_fts_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fts_search ON public.search_index USING gin (document);


--
-- Name: idx_reactions_emoji_full; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reactions_emoji_full ON public.reactions USING btree (emoji_base);


--
-- Name: idx_reactions_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reactions_entity_id ON public.reactions USING btree (entity_id);


--
-- Name: idx_reactions_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reactions_entity_type ON public.reactions USING btree (entity_type);


--
-- Name: index_users_on_name_trigram; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_users_on_name_trigram ON public.users USING gin (name public.gin_trgm_ops);


--
-- Name: ix_comment_post_2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_comment_post_2 ON public.comments USING btree (post_id);


--
-- Name: ix_comment_user_1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_comment_user_1 ON public.comments USING btree (user_id);


--
-- Name: ix_community_invite_community_1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_community_invite_community_1 ON public.group_invites USING btree (community_id);


--
-- Name: ix_community_invite_invited_by_3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_community_invite_invited_by_3 ON public.group_invites USING btree (invited_by_id);


--
-- Name: ix_community_invite_used_by_2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_community_invite_used_by_2 ON public.group_invites USING btree (used_by_id);


--
-- Name: ix_contributor_post_1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_contributor_post_1 ON public.contributions USING btree (post_id);


--
-- Name: ix_contributor_user_2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_contributor_user_2 ON public.contributions USING btree (user_id);


--
-- Name: ix_follower_addedby_3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_follower_addedby_3 ON public.follows USING btree (added_by_id);


--
-- Name: ix_follower_post_1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_follower_post_1 ON public.follows USING btree (post_id);


--
-- Name: ix_follower_user_2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_follower_user_2 ON public.follows USING btree (user_id);


--
-- Name: ix_linked_account_user_4; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_linked_account_user_4 ON public.linked_account USING btree (user_id);


--
-- Name: ix_media_post_1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_media_post_1 ON public.media USING btree (post_id);


--
-- Name: ix_post_creator_11; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_post_creator_11 ON public.posts USING btree (user_id);


--
-- Name: ix_thank_you_comment_1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_thank_you_comment_1 ON public.thanks USING btree (comment_id);


--
-- Name: ix_thank_you_thanked_by_3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_thank_you_thanked_by_3 ON public.thanks USING btree (thanked_by_id);


--
-- Name: ix_thank_you_user_2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_thank_you_user_2 ON public.thanks USING btree (user_id);


--
-- Name: ix_vote_user_13; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_vote_user_13 ON public.reactions USING btree (user_id);


--
-- Name: join_request_question_answers_join_request_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX join_request_question_answers_join_request_id_index ON public.group_join_questions_answers USING btree (join_request_id);


--
-- Name: join_requests_community_id_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX join_requests_community_id_status_index ON public.join_requests USING btree (community_id, status);


--
-- Name: location_center_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX location_center_idx ON public.locations USING gist (center);


--
-- Name: members_roles_group_id_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX members_roles_group_id_user_id_index ON public.group_memberships_group_roles USING btree (group_id, user_id);


--
-- Name: notifications_pk_medium_0; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_pk_medium_0 ON public.notifications USING btree (id) WHERE (medium = 0);


--
-- Name: posts_proposal_outcome_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_proposal_outcome_index ON public.posts USING btree (proposal_outcome);


--
-- Name: posts_proposal_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_proposal_status_index ON public.posts USING btree (proposal_status);


--
-- Name: public_communities_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX public_communities_idx ON public.communities USING btree (is_public);


--
-- Name: public_posts_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX public_posts_idx ON public.posts USING btree (is_public);


--
-- Name: saved_search_topics_saved_search_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX saved_search_topics_saved_search_id_index ON public.saved_search_topics USING btree (saved_search_id);


--
-- Name: saved_searches_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX saved_searches_user_id_index ON public.saved_searches USING btree (user_id);


--
-- Name: user_verification_codes_email_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_verification_codes_email_index ON public.user_verification_codes USING btree (email);


--
-- Name: zapier_triggers_groups_zapier_trigger_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX zapier_triggers_groups_zapier_trigger_id_index ON public.zapier_triggers_groups USING btree (zapier_trigger_id);


--
-- Name: activities activities_contribution_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_contribution_id_foreign FOREIGN KEY (contribution_id) REFERENCES public.contributions(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: activities activities_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_group_id_foreign FOREIGN KEY (group_id) REFERENCES public.groups(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: activities activities_other_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_other_group_id_foreign FOREIGN KEY (other_group_id) REFERENCES public.groups(id);


--
-- Name: activities activities_parent_comment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_parent_comment_id_foreign FOREIGN KEY (parent_comment_id) REFERENCES public.comments(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: activities activities_project_contribution_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_project_contribution_id_foreign FOREIGN KEY (project_contribution_id) REFERENCES public.project_contributions(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: activities activity_actor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activity_actor_id_foreign FOREIGN KEY (actor_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: activities activity_comment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activity_comment_id_foreign FOREIGN KEY (comment_id) REFERENCES public.comments(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: activities activity_community_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activity_community_id_foreign FOREIGN KEY (community_id) REFERENCES public.communities(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: activities activity_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activity_post_id_foreign FOREIGN KEY (post_id) REFERENCES public.posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: activities activity_reader_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activity_reader_id_foreign FOREIGN KEY (reader_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: blocked_users blocked_users_blocked_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_blocked_user_id_foreign FOREIGN KEY (blocked_user_id) REFERENCES public.users(id);


--
-- Name: blocked_users blocked_users_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_users
    ADD CONSTRAINT blocked_users_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: collections collections_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_group_id_foreign FOREIGN KEY (group_id) REFERENCES public.groups(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: collections_posts collections_posts_collection_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections_posts
    ADD CONSTRAINT collections_posts_collection_id_foreign FOREIGN KEY (collection_id) REFERENCES public.collections(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: collections_posts collections_posts_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections_posts
    ADD CONSTRAINT collections_posts_post_id_foreign FOREIGN KEY (post_id) REFERENCES public.posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: collections_posts collections_posts_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections_posts
    ADD CONSTRAINT collections_posts_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: collections collections_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: comments comments_comment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_comment_id_foreign FOREIGN KEY (comment_id) REFERENCES public.comments(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: comments_tags comments_tags_comment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments_tags
    ADD CONSTRAINT comments_tags_comment_id_foreign FOREIGN KEY (comment_id) REFERENCES public.comments(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: comments_tags comments_tags_tag_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments_tags
    ADD CONSTRAINT comments_tags_tag_id_foreign FOREIGN KEY (tag_id) REFERENCES public.tags(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: common_roles_responsibilities common_roles_responsibilities_common_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.common_roles_responsibilities
    ADD CONSTRAINT common_roles_responsibilities_common_role_id_foreign FOREIGN KEY (common_role_id) REFERENCES public.common_roles(id);


--
-- Name: common_roles_responsibilities common_roles_responsibilities_responsibility_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.common_roles_responsibilities
    ADD CONSTRAINT common_roles_responsibilities_responsibility_id_foreign FOREIGN KEY (responsibility_id) REFERENCES public.responsibilities(id);


--
-- Name: communities communities_location_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT communities_location_id_foreign FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: groups_tags communities_tags_community_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_tags
    ADD CONSTRAINT communities_tags_community_id_foreign FOREIGN KEY (community_id) REFERENCES public.communities(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: groups_tags communities_tags_owner_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_tags
    ADD CONSTRAINT communities_tags_owner_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: groups_tags communities_tags_tag_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_tags
    ADD CONSTRAINT communities_tags_tag_id_foreign FOREIGN KEY (tag_id) REFERENCES public.tags(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: group_invites community_invite_tag_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invites
    ADD CONSTRAINT community_invite_tag_id_foreign FOREIGN KEY (tag_id) REFERENCES public.tags(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: group_invites community_invites_expired_by_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invites
    ADD CONSTRAINT community_invites_expired_by_id_foreign FOREIGN KEY (expired_by_id) REFERENCES public.users(id);


--
-- Name: communities community_leader_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT community_leader_id_foreign FOREIGN KEY (leader_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: communities community_network_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT community_network_id_foreign FOREIGN KEY (network_id) REFERENCES public.networks(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: custom_view_topics custom_view_topics_custom_view_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_view_topics
    ADD CONSTRAINT custom_view_topics_custom_view_id_foreign FOREIGN KEY (custom_view_id) REFERENCES public.custom_views(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: custom_view_topics custom_view_topics_tag_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_view_topics
    ADD CONSTRAINT custom_view_topics_tag_id_foreign FOREIGN KEY (tag_id) REFERENCES public.tags(id);


--
-- Name: custom_views custom_views_collection_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_views
    ADD CONSTRAINT custom_views_collection_id_foreign FOREIGN KEY (collection_id) REFERENCES public.collections(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: custom_views custom_views_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_views
    ADD CONSTRAINT custom_views_group_id_foreign FOREIGN KEY (group_id) REFERENCES public.groups(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: devices devices_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: event_invitations event_invitations_event_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_invitations
    ADD CONSTRAINT event_invitations_event_id_foreign FOREIGN KEY (event_id) REFERENCES public.posts(id);


--
-- Name: event_invitations event_invitations_inviter_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_invitations
    ADD CONSTRAINT event_invitations_inviter_id_foreign FOREIGN KEY (inviter_id) REFERENCES public.users(id);


--
-- Name: event_invitations event_invitations_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_invitations
    ADD CONSTRAINT event_invitations_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: event_responses event_responses_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_responses
    ADD CONSTRAINT event_responses_post_id_foreign FOREIGN KEY (post_id) REFERENCES public.posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: event_responses event_responses_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_responses
    ADD CONSTRAINT event_responses_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: comments fk_comment_deactivated_by_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT fk_comment_deactivated_by_01 FOREIGN KEY (deactivated_by_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: comments fk_comment_post_2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT fk_comment_post_2 FOREIGN KEY (post_id) REFERENCES public.posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: comments fk_comment_user_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT fk_comment_user_1 FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: communities fk_community_created_by_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT fk_community_created_by_1 FOREIGN KEY (created_by_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: group_invites fk_community_invite_community_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invites
    ADD CONSTRAINT fk_community_invite_community_1 FOREIGN KEY (community_id) REFERENCES public.communities(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: group_invites fk_community_invite_invited_by_3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invites
    ADD CONSTRAINT fk_community_invite_invited_by_3 FOREIGN KEY (invited_by_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: group_invites fk_community_invite_used_by_2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invites
    ADD CONSTRAINT fk_community_invite_used_by_2 FOREIGN KEY (used_by_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: contributions fk_contributor_post_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT fk_contributor_post_1 FOREIGN KEY (post_id) REFERENCES public.posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: contributions fk_contributor_user_2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT fk_contributor_user_2 FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: follows fk_follower_addedby_3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT fk_follower_addedby_3 FOREIGN KEY (added_by_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: follows fk_follower_post_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT fk_follower_post_1 FOREIGN KEY (post_id) REFERENCES public.posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: follows fk_follower_user_2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT fk_follower_user_2 FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: linked_account fk_linked_account_user_4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linked_account
    ADD CONSTRAINT fk_linked_account_user_4 FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: media fk_media_post_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT fk_media_post_1 FOREIGN KEY (post_id) REFERENCES public.posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: groups_posts fk_post_community_community_02; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_posts
    ADD CONSTRAINT fk_post_community_community_02 FOREIGN KEY (community_id) REFERENCES public.communities(id) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: posts fk_post_creator_11; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT fk_post_creator_11 FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: posts fk_post_deactivated_by_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT fk_post_deactivated_by_01 FOREIGN KEY (deactivated_by_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: thanks fk_thank_you_comment_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thanks
    ADD CONSTRAINT fk_thank_you_comment_1 FOREIGN KEY (comment_id) REFERENCES public.comments(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: thanks fk_thank_you_thanked_by_3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thanks
    ADD CONSTRAINT fk_thank_you_thanked_by_3 FOREIGN KEY (thanked_by_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: thanks fk_thank_you_user_2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thanks
    ADD CONSTRAINT fk_thank_you_user_2 FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: user_post_relevance fk_upr_post_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_post_relevance
    ADD CONSTRAINT fk_upr_post_1 FOREIGN KEY (post_id) REFERENCES public.posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: user_post_relevance fk_upr_user_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_post_relevance
    ADD CONSTRAINT fk_upr_user_1 FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: communities_users fk_users_community_community_02; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities_users
    ADD CONSTRAINT fk_users_community_community_02 FOREIGN KEY (community_id) REFERENCES public.communities(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: communities_users fk_users_community_users_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities_users
    ADD CONSTRAINT fk_users_community_users_01 FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: reactions fk_vote_user_13; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT fk_vote_user_13 FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: flagged_items flagged_items_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flagged_items
    ADD CONSTRAINT flagged_items_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: tag_follows followed_tags_community_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_follows
    ADD CONSTRAINT followed_tags_community_id_foreign FOREIGN KEY (community_id) REFERENCES public.communities(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: tag_follows followed_tags_tag_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_follows
    ADD CONSTRAINT followed_tags_tag_id_foreign FOREIGN KEY (tag_id) REFERENCES public.tags(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: tag_follows followed_tags_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_follows
    ADD CONSTRAINT followed_tags_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: follows follows_comment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_comment_id_foreign FOREIGN KEY (comment_id) REFERENCES public.comments(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: group_relationships group_connections_child_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_relationships
    ADD CONSTRAINT group_connections_child_group_id_foreign FOREIGN KEY (child_group_id) REFERENCES public.groups(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: group_relationships group_connections_parent_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_relationships
    ADD CONSTRAINT group_connections_parent_group_id_foreign FOREIGN KEY (parent_group_id) REFERENCES public.groups(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: group_extensions group_extensions_extension_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_extensions
    ADD CONSTRAINT group_extensions_extension_id_foreign FOREIGN KEY (extension_id) REFERENCES public.extensions(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: group_extensions group_extensions_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_extensions
    ADD CONSTRAINT group_extensions_group_id_foreign FOREIGN KEY (group_id) REFERENCES public.groups(id);


--
-- Name: group_invites group_invites_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invites
    ADD CONSTRAINT group_invites_group_id_foreign FOREIGN KEY (group_id) REFERENCES public.groups(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: group_join_questions_answers group_join_questions_answers_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_join_questions_answers
    ADD CONSTRAINT group_join_questions_answers_group_id_foreign FOREIGN KEY (group_id) REFERENCES public.groups(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: group_join_questions_answers group_join_questions_answers_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_join_questions_answers
    ADD CONSTRAINT group_join_questions_answers_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: group_join_questions group_join_questions_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_join_questions
    ADD CONSTRAINT group_join_questions_group_id_foreign FOREIGN KEY (group_id) REFERENCES public.groups(id);


--
-- Name: group_join_questions group_join_questions_question_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_join_questions
    ADD CONSTRAINT group_join_questions_question_id_foreign FOREIGN KEY (question_id) REFERENCES public.questions(id);


--
-- Name: group_memberships_common_roles group_memberships_common_roles_common_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships_common_roles
    ADD CONSTRAINT group_memberships_common_roles_common_role_id_foreign FOREIGN KEY (common_role_id) REFERENCES public.common_roles(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: group_memberships_common_roles group_memberships_common_roles_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships_common_roles
    ADD CONSTRAINT group_memberships_common_roles_group_id_foreign FOREIGN KEY (group_id) REFERENCES public.groups(id);


--
-- Name: group_memberships_common_roles group_memberships_common_roles_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships_common_roles
    ADD CONSTRAINT group_memberships_common_roles_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: group_memberships group_memberships_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships
    ADD CONSTRAINT group_memberships_group_id_foreign FOREIGN KEY (group_id) REFERENCES public.groups(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: group_memberships group_memberships_project_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships
    ADD CONSTRAINT group_memberships_project_role_id_foreign FOREIGN KEY (project_role_id) REFERENCES public.project_roles(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: group_memberships group_memberships_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships
    ADD CONSTRAINT group_memberships_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: group_relationship_invites group_relationship_invites_canceled_by_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_relationship_invites
    ADD CONSTRAINT group_relationship_invites_canceled_by_id_foreign FOREIGN KEY (canceled_by_id) REFERENCES public.users(id);


--
-- Name: group_relationship_invites group_relationship_invites_created_by_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_relationship_invites
    ADD CONSTRAINT group_relationship_invites_created_by_id_foreign FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: group_relationship_invites group_relationship_invites_from_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_relationship_invites
    ADD CONSTRAINT group_relationship_invites_from_group_id_foreign FOREIGN KEY (from_group_id) REFERENCES public.groups(id);


--
-- Name: group_relationship_invites group_relationship_invites_processed_by_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_relationship_invites
    ADD CONSTRAINT group_relationship_invites_processed_by_id_foreign FOREIGN KEY (processed_by_id) REFERENCES public.users(id);


--
-- Name: group_relationship_invites group_relationship_invites_to_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_relationship_invites
    ADD CONSTRAINT group_relationship_invites_to_group_id_foreign FOREIGN KEY (to_group_id) REFERENCES public.groups(id);


--
-- Name: group_roles_responsibilities group_roles_responsibilities_group_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_roles_responsibilities
    ADD CONSTRAINT group_roles_responsibilities_group_role_id_foreign FOREIGN KEY (group_role_id) REFERENCES public.groups_roles(id);


--
-- Name: group_roles_responsibilities group_roles_responsibilities_responsibility_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_roles_responsibilities
    ADD CONSTRAINT group_roles_responsibilities_responsibility_id_foreign FOREIGN KEY (responsibility_id) REFERENCES public.responsibilities(id);


--
-- Name: group_to_group_join_questions group_to_group_join_questions_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_to_group_join_questions
    ADD CONSTRAINT group_to_group_join_questions_group_id_foreign FOREIGN KEY (group_id) REFERENCES public.groups(id);


--
-- Name: group_to_group_join_questions group_to_group_join_questions_question_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_to_group_join_questions
    ADD CONSTRAINT group_to_group_join_questions_question_id_foreign FOREIGN KEY (question_id) REFERENCES public.questions(id);


--
-- Name: group_to_group_join_request_question_answers group_to_group_join_request_question_answers_join_request_id_fo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_to_group_join_request_question_answers
    ADD CONSTRAINT group_to_group_join_request_question_answers_join_request_id_fo FOREIGN KEY (join_request_id) REFERENCES public.group_relationship_invites(id);


--
-- Name: group_to_group_join_request_question_answers group_to_group_join_request_question_answers_question_id_foreig; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_to_group_join_request_question_answers
    ADD CONSTRAINT group_to_group_join_request_question_answers_question_id_foreig FOREIGN KEY (question_id) REFERENCES public.questions(id);


--
-- Name: group_widgets group_widgets_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_widgets
    ADD CONSTRAINT group_widgets_group_id_foreign FOREIGN KEY (group_id) REFERENCES public.groups(id);


--
-- Name: group_widgets group_widgets_widget_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_widgets
    ADD CONSTRAINT group_widgets_widget_id_foreign FOREIGN KEY (widget_id) REFERENCES public.widgets(id);


--
-- Name: groups_agreements groups_agreements_agreement_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_agreements
    ADD CONSTRAINT groups_agreements_agreement_id_foreign FOREIGN KEY (agreement_id) REFERENCES public.agreements(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: groups_agreements groups_agreements_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_agreements
    ADD CONSTRAINT groups_agreements_group_id_foreign FOREIGN KEY (group_id) REFERENCES public.groups(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: groups groups_created_by_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_created_by_id_foreign FOREIGN KEY (created_by_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: groups groups_location_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_location_id_foreign FOREIGN KEY (location_id) REFERENCES public.locations(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: groups_posts groups_posts_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_posts
    ADD CONSTRAINT groups_posts_group_id_foreign FOREIGN KEY (group_id) REFERENCES public.groups(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: groups_roles groups_roles_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_roles
    ADD CONSTRAINT groups_roles_group_id_foreign FOREIGN KEY (group_id) REFERENCES public.groups(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: groups_suggested_skills groups_suggested_skills_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_suggested_skills
    ADD CONSTRAINT groups_suggested_skills_group_id_foreign FOREIGN KEY (group_id) REFERENCES public.groups(id);


--
-- Name: groups_suggested_skills groups_suggested_skills_skill_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_suggested_skills
    ADD CONSTRAINT groups_suggested_skills_skill_id_foreign FOREIGN KEY (skill_id) REFERENCES public.skills(id);


--
-- Name: groups_tags groups_tags_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups_tags
    ADD CONSTRAINT groups_tags_group_id_foreign FOREIGN KEY (group_id) REFERENCES public.groups(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: group_join_questions_answers join_request_question_answers_join_request_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_join_questions_answers
    ADD CONSTRAINT join_request_question_answers_join_request_id_foreign FOREIGN KEY (join_request_id) REFERENCES public.join_requests(id);


--
-- Name: group_join_questions_answers join_request_question_answers_question_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_join_questions_answers
    ADD CONSTRAINT join_request_question_answers_question_id_foreign FOREIGN KEY (question_id) REFERENCES public.questions(id);


--
-- Name: join_requests join_requests_community_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.join_requests
    ADD CONSTRAINT join_requests_community_id_foreign FOREIGN KEY (community_id) REFERENCES public.communities(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: join_requests join_requests_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.join_requests
    ADD CONSTRAINT join_requests_group_id_foreign FOREIGN KEY (group_id) REFERENCES public.groups(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: join_requests join_requests_processed_by_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.join_requests
    ADD CONSTRAINT join_requests_processed_by_id_foreign FOREIGN KEY (processed_by_id) REFERENCES public.users(id);


--
-- Name: join_requests join_requests_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.join_requests
    ADD CONSTRAINT join_requests_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: media media_comment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_comment_id_foreign FOREIGN KEY (comment_id) REFERENCES public.comments(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: group_memberships_group_roles members_roles_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships_group_roles
    ADD CONSTRAINT members_roles_group_id_foreign FOREIGN KEY (group_id) REFERENCES public.groups(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: group_memberships_group_roles members_roles_group_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships_group_roles
    ADD CONSTRAINT members_roles_group_role_id_foreign FOREIGN KEY (group_role_id) REFERENCES public.groups_roles(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: group_memberships_group_roles members_roles_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships_group_roles
    ADD CONSTRAINT members_roles_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: moderation_actions_agreements moderation_actions_agreements_agreement_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_actions_agreements
    ADD CONSTRAINT moderation_actions_agreements_agreement_id_foreign FOREIGN KEY (agreement_id) REFERENCES public.agreements(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: moderation_actions_agreements moderation_actions_agreements_moderation_action_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_actions_agreements
    ADD CONSTRAINT moderation_actions_agreements_moderation_action_id_foreign FOREIGN KEY (moderation_action_id) REFERENCES public.moderation_actions(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: moderation_actions_platform_agreements moderation_actions_platform_agreements_moderation_action_id_for; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_actions_platform_agreements
    ADD CONSTRAINT moderation_actions_platform_agreements_moderation_action_id_for FOREIGN KEY (moderation_action_id) REFERENCES public.moderation_actions(id);


--
-- Name: moderation_actions_platform_agreements moderation_actions_platform_agreements_platform_agreement_id_fo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_actions_platform_agreements
    ADD CONSTRAINT moderation_actions_platform_agreements_platform_agreement_id_fo FOREIGN KEY (platform_agreement_id) REFERENCES public.platform_agreements(id);


--
-- Name: moderation_actions moderation_actions_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_actions
    ADD CONSTRAINT moderation_actions_post_id_foreign FOREIGN KEY (post_id) REFERENCES public.posts(id);


--
-- Name: moderation_actions moderation_actions_reporter_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moderation_actions
    ADD CONSTRAINT moderation_actions_reporter_id_foreign FOREIGN KEY (reporter_id) REFERENCES public.users(id);


--
-- Name: networks_posts networks_posts_network_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networks_posts
    ADD CONSTRAINT networks_posts_network_id_foreign FOREIGN KEY (network_id) REFERENCES public.networks(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: networks_posts networks_posts_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networks_posts
    ADD CONSTRAINT networks_posts_post_id_foreign FOREIGN KEY (post_id) REFERENCES public.posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: networks_users networks_users_network_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networks_users
    ADD CONSTRAINT networks_users_network_id_foreign FOREIGN KEY (network_id) REFERENCES public.networks(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: networks_users networks_users_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networks_users
    ADD CONSTRAINT networks_users_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: nexudus_accounts nexudus_accounts_community_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexudus_accounts
    ADD CONSTRAINT nexudus_accounts_community_id_foreign FOREIGN KEY (community_id) REFERENCES public.communities(id);


--
-- Name: notifications notifications_activity_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_activity_id_foreign FOREIGN KEY (activity_id) REFERENCES public.activities(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: notifications notifications_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: posts post_link_preview_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT post_link_preview_id_foreign FOREIGN KEY (link_preview_id) REFERENCES public.link_previews(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: posts post_parent_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT post_parent_post_id_foreign FOREIGN KEY (parent_post_id) REFERENCES public.posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: posts_about_users posts_about_users_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts_about_users
    ADD CONSTRAINT posts_about_users_post_id_foreign FOREIGN KEY (post_id) REFERENCES public.posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: posts_about_users posts_about_users_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts_about_users
    ADD CONSTRAINT posts_about_users_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: posts posts_location_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_location_id_foreign FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: posts_tags posts_tags_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts_tags
    ADD CONSTRAINT posts_tags_post_id_foreign FOREIGN KEY (post_id) REFERENCES public.posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: posts_tags posts_tags_tag_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts_tags
    ADD CONSTRAINT posts_tags_tag_id_foreign FOREIGN KEY (tag_id) REFERENCES public.tags(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: posts_users posts_users_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts_users
    ADD CONSTRAINT posts_users_post_id_foreign FOREIGN KEY (post_id) REFERENCES public.posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: posts_users posts_users_project_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts_users
    ADD CONSTRAINT posts_users_project_role_id_foreign FOREIGN KEY (project_role_id) REFERENCES public.project_roles(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: posts_users posts_users_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts_users
    ADD CONSTRAINT posts_users_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: project_contributions project_contributions_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_contributions
    ADD CONSTRAINT project_contributions_post_id_foreign FOREIGN KEY (post_id) REFERENCES public.posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: project_contributions project_contributions_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_contributions
    ADD CONSTRAINT project_contributions_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: project_roles project_roles_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_roles
    ADD CONSTRAINT project_roles_post_id_foreign FOREIGN KEY (post_id) REFERENCES public.posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: proposal_options proposal_options_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_options
    ADD CONSTRAINT proposal_options_post_id_foreign FOREIGN KEY (post_id) REFERENCES public.posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: proposal_votes proposal_votes_option_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_votes
    ADD CONSTRAINT proposal_votes_option_id_foreign FOREIGN KEY (option_id) REFERENCES public.proposal_options(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: proposal_votes proposal_votes_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_votes
    ADD CONSTRAINT proposal_votes_post_id_foreign FOREIGN KEY (post_id) REFERENCES public.posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: proposal_votes proposal_votes_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_votes
    ADD CONSTRAINT proposal_votes_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: push_notifications push_notifications_device_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_notifications
    ADD CONSTRAINT push_notifications_device_id_foreign FOREIGN KEY (device_id) REFERENCES public.devices(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: responsibilities responsibilities_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.responsibilities
    ADD CONSTRAINT responsibilities_group_id_foreign FOREIGN KEY (group_id) REFERENCES public.groups(id);


--
-- Name: saved_search_topics saved_search_topics_saved_search_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_search_topics
    ADD CONSTRAINT saved_search_topics_saved_search_id_foreign FOREIGN KEY (saved_search_id) REFERENCES public.saved_searches(id);


--
-- Name: saved_search_topics saved_search_topics_tag_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_search_topics
    ADD CONSTRAINT saved_search_topics_tag_id_foreign FOREIGN KEY (tag_id) REFERENCES public.tags(id);


--
-- Name: saved_searches saved_searches_last_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_searches
    ADD CONSTRAINT saved_searches_last_post_id_foreign FOREIGN KEY (last_post_id) REFERENCES public.posts(id);


--
-- Name: saved_searches saved_searches_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_searches
    ADD CONSTRAINT saved_searches_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: skills_users skills_users_skill_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills_users
    ADD CONSTRAINT skills_users_skill_id_foreign FOREIGN KEY (skill_id) REFERENCES public.skills(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: skills_users skills_users_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills_users
    ADD CONSTRAINT skills_users_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: tag_follows tag_follows_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_follows
    ADD CONSTRAINT tag_follows_group_id_foreign FOREIGN KEY (group_id) REFERENCES public.groups(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: tag_follows tag_follows_last_read_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_follows
    ADD CONSTRAINT tag_follows_last_read_post_id_foreign FOREIGN KEY (last_read_post_id) REFERENCES public.posts(id);


--
-- Name: user_affiliations user_affiliations_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_affiliations
    ADD CONSTRAINT user_affiliations_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_connections user_connections_other_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_connections
    ADD CONSTRAINT user_connections_other_user_id_foreign FOREIGN KEY (other_user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: user_connections user_connections_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_connections
    ADD CONSTRAINT user_connections_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: user_external_data user_external_data_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_external_data
    ADD CONSTRAINT user_external_data_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: communities_users users_community_deactivator_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communities_users
    ADD CONSTRAINT users_community_deactivator_id_foreign FOREIGN KEY (deactivator_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: users_groups_agreements users_groups_agreements_agreement_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_groups_agreements
    ADD CONSTRAINT users_groups_agreements_agreement_id_foreign FOREIGN KEY (agreement_id) REFERENCES public.agreements(id);


--
-- Name: users_groups_agreements users_groups_agreements_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_groups_agreements
    ADD CONSTRAINT users_groups_agreements_group_id_foreign FOREIGN KEY (group_id) REFERENCES public.groups(id);


--
-- Name: users_groups_agreements users_groups_agreements_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_groups_agreements
    ADD CONSTRAINT users_groups_agreements_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users users_location_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_location_id_foreign FOREIGN KEY (location_id) REFERENCES public.locations(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: users users_stripe_account_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_stripe_account_id_foreign FOREIGN KEY (stripe_account_id) REFERENCES public.stripe_accounts(id);


--
-- Name: zapier_triggers_groups zapier_triggers_groups_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zapier_triggers_groups
    ADD CONSTRAINT zapier_triggers_groups_group_id_foreign FOREIGN KEY (group_id) REFERENCES public.groups(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: zapier_triggers_groups zapier_triggers_groups_zapier_trigger_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zapier_triggers_groups
    ADD CONSTRAINT zapier_triggers_groups_zapier_trigger_id_foreign FOREIGN KEY (zapier_trigger_id) REFERENCES public.zapier_triggers(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: zapier_triggers zapier_triggers_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zapier_triggers
    ADD CONSTRAINT zapier_triggers_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- PostgreSQL database dump complete
--

