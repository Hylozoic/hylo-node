--
-- PostgreSQL database dump
--

-- Dumped from database version 9.6.2
-- Dumped by pg_dump version 9.6.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

SET search_path = public, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE activities (
    id integer NOT NULL,
    actor_id bigint,
    reader_id bigint,
    post_id bigint,
    comment_id bigint,
    action character varying(255),
    unread boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    community_id bigint,
    meta jsonb DEFAULT '{}'::jsonb,
    parent_comment_id bigint,
    contribution_id bigint
);


--
-- Name: activity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE activity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE activity_id_seq OWNED BY activities.id;


--
-- Name: comment_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE comment_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE comments (
    id bigint DEFAULT nextval('comment_seq'::regclass) NOT NULL,
    user_id bigint,
    post_id bigint,
    created_at timestamp without time zone,
    text text,
    active boolean,
    deactivated_reason character varying(255),
    deactivated_by_id bigint,
    deactivated_at timestamp without time zone,
    recent boolean,
    created_from character varying(255),
    comment_id bigint
);


--
-- Name: comments_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE comments_tags (
    id integer NOT NULL,
    comment_id bigint,
    tag_id bigint,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: comments_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE comments_tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comments_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE comments_tags_id_seq OWNED BY comments_tags.id;


--
-- Name: community_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE community_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: communities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE communities (
    id bigint DEFAULT nextval('community_seq'::regclass) NOT NULL,
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
    active boolean DEFAULT true
);


--
-- Name: communities_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE communities_posts (
    post_id bigint NOT NULL,
    community_id bigint NOT NULL,
    id integer NOT NULL,
    pinned boolean DEFAULT false
);


--
-- Name: communities_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE communities_tags (
    id integer NOT NULL,
    community_id bigint,
    tag_id bigint,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    user_id bigint,
    description text,
    is_default boolean DEFAULT false
);


--
-- Name: communities_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE communities_tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: communities_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE communities_tags_id_seq OWNED BY communities_tags.id;


--
-- Name: communities_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE communities_users (
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

CREATE SEQUENCE community_invite_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: community_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE community_invites (
    id bigint DEFAULT nextval('community_invite_seq'::regclass) NOT NULL,
    community_id bigint NOT NULL,
    created_at timestamp without time zone NOT NULL,
    invited_by_id bigint NOT NULL,
    used_by_id bigint,
    token text NOT NULL,
    used_at timestamp without time zone,
    email text NOT NULL,
    role smallint DEFAULT 0,
    tag_id bigint,
    last_sent_at timestamp with time zone,
    sent_count integer DEFAULT 0,
    subject character varying(255),
    message text
);


--
-- Name: contributor_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE contributor_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE contributions (
    id bigint DEFAULT nextval('contributor_seq'::regclass) NOT NULL,
    post_id bigint NOT NULL,
    user_id bigint NOT NULL,
    contributed_at timestamp without time zone NOT NULL
);


--
-- Name: device_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE device_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE devices (
    id integer NOT NULL,
    user_id bigint,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    badge_no integer DEFAULT 0,
    token character varying(255),
    enabled boolean DEFAULT true,
    platform character varying(255),
    version character varying(255)
);


--
-- Name: devices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE devices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: devices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE devices_id_seq OWNED BY devices.id;


--
-- Name: event_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE event_responses (
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

CREATE SEQUENCE event_responses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: event_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE event_responses_id_seq OWNED BY event_responses.id;


--
-- Name: tag_follows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE tag_follows (
    id integer NOT NULL,
    community_id bigint,
    tag_id bigint,
    user_id bigint,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    new_post_count integer DEFAULT 0
);


--
-- Name: followed_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE followed_tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: followed_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE followed_tags_id_seq OWNED BY tag_follows.id;


--
-- Name: follower_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE follower_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: follows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE follows (
    id bigint DEFAULT nextval('follower_seq'::regclass) NOT NULL,
    post_id bigint,
    added_at timestamp without time zone,
    user_id bigint,
    added_by_id bigint,
    role integer,
    comment_id bigint
);


--
-- Name: invite_request_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE invite_request_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: join_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE join_requests (
    id integer NOT NULL,
    user_id bigint,
    community_id bigint,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: join_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE join_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: join_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE join_requests_id_seq OWNED BY join_requests.id;


--
-- Name: knex_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE knex_migrations (
    id integer NOT NULL,
    name character varying(255),
    batch integer,
    migration_time timestamp with time zone
);


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE knex_migrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE knex_migrations_id_seq OWNED BY knex_migrations.id;


--
-- Name: knex_migrations_lock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE knex_migrations_lock (
    is_locked integer
);


--
-- Name: link_previews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE link_previews (
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

CREATE SEQUENCE link_previews_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: link_previews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE link_previews_id_seq OWNED BY link_previews.id;


--
-- Name: linked_account_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE linked_account_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: linked_account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE linked_account (
    id bigint DEFAULT nextval('linked_account_seq'::regclass) NOT NULL,
    user_id bigint,
    provider_user_id character varying(255),
    provider_key character varying(255)
);


--
-- Name: media_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE media_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE media (
    id bigint DEFAULT nextval('media_seq'::regclass) NOT NULL,
    type character varying(255),
    url character varying(255),
    thumbnail_url character varying(255),
    created_at timestamp without time zone,
    post_id bigint,
    name character varying(255),
    width integer,
    height integer,
    comment_id bigint
);


--
-- Name: networks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE networks (
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

CREATE SEQUENCE networks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: networks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE networks_id_seq OWNED BY networks.id;


--
-- Name: nexudus_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE nexudus_accounts (
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

CREATE SEQUENCE nexudus_accounts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexudus_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE nexudus_accounts_id_seq OWNED BY nexudus_accounts.id;


--
-- Name: notification_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE notification_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_status_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE notification_status_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE notifications (
    id integer NOT NULL,
    activity_id bigint,
    sent_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    medium character varying(255),
    failed_at timestamp with time zone
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE notifications_id_seq OWNED BY notifications.id;


--
-- Name: org_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE org_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: post_community_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE post_community_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: post_community_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE post_community_id_seq OWNED BY communities_posts.id;


--
-- Name: post_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE post_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: post_view_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE post_view_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE posts (
    id bigint DEFAULT nextval('post_seq'::regclass) NOT NULL,
    name text,
    description text,
    type character varying(255),
    created_at timestamp without time zone,
    user_id bigint,
    num_votes integer,
    num_comments integer,
    active boolean,
    deactivated_by_id bigint,
    deactivated_at timestamp without time zone,
    deactivated_reason character varying(255),
    fulfilled_at timestamp without time zone,
    updated_at timestamp without time zone,
    visibility integer DEFAULT 0,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    location character varying(255),
    created_from character varying(255),
    parent_post_id bigint,
    link_preview_id integer,
    is_project_request boolean DEFAULT false
);


--
-- Name: posts_about_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE posts_about_users (
    post_id bigint,
    user_id bigint
);


--
-- Name: posts_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE posts_tags (
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

CREATE SEQUENCE posts_tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: posts_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE posts_tags_id_seq OWNED BY posts_tags.id;


--
-- Name: posts_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE posts_users (
    id integer NOT NULL,
    user_id bigint,
    post_id bigint,
    last_read_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: posts_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE posts_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: posts_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE posts_users_id_seq OWNED BY posts_users.id;


--
-- Name: push_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE push_notifications (
    id integer NOT NULL,
    device_token character varying(255),
    queued_at timestamp with time zone,
    sent_at timestamp with time zone,
    alert character varying(255) DEFAULT ''::character varying,
    badge_no integer DEFAULT 0,
    platform character varying(255),
    path character varying(255)
);


--
-- Name: queued_pushes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE queued_pushes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: queued_pushes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE queued_pushes_id_seq OWNED BY push_notifications.id;


--
-- Name: security_role_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE security_role_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skill_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE skill_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE tags (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE tags_id_seq OWNED BY tags.id;


--
-- Name: tags_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE tags_users (
    id integer NOT NULL,
    tag_id bigint,
    user_id bigint,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: tags_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE tags_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tags_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE tags_users_id_seq OWNED BY tags_users.id;


--
-- Name: thank_you_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE thank_you_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: thanks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE thanks (
    id bigint DEFAULT nextval('thank_you_seq'::regclass) NOT NULL,
    comment_id bigint NOT NULL,
    date_thanked timestamp without time zone NOT NULL,
    user_id bigint NOT NULL,
    thanked_by_id bigint NOT NULL
);


--
-- Name: token_action_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE token_action_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE user_connections (
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

CREATE SEQUENCE user_connections_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_connections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE user_connections_id_seq OWNED BY user_connections.id;


--
-- Name: user_external_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE user_external_data (
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

CREATE SEQUENCE user_external_data_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_external_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE user_external_data_id_seq OWNED BY user_external_data.id;


--
-- Name: user_permission_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE user_permission_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_post_relevance_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE user_post_relevance_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_post_relevance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE user_post_relevance (
    id bigint DEFAULT nextval('user_post_relevance_seq'::regclass) NOT NULL,
    user_id bigint,
    post_id bigint,
    similarity real,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: users_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE users_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE users (
    id bigint DEFAULT nextval('users_seq'::regclass) NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(255),
    avatar_url character varying(255),
    first_name character varying(255),
    last_name character varying(255),
    last_login_at timestamp without time zone,
    active boolean,
    email_validated boolean,
    created_at timestamp without time zone,
    date_deactivated timestamp without time zone,
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
    tagline character varying(255)
);


--
-- Name: users_community_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE users_community_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_community_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE users_community_id_seq OWNED BY communities_users.id;


--
-- Name: vote_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE vote_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE votes (
    id bigint DEFAULT nextval('vote_seq'::regclass) NOT NULL,
    user_id bigint,
    post_id bigint,
    date_voted timestamp without time zone
);


--
-- Name: activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY activities ALTER COLUMN id SET DEFAULT nextval('activity_id_seq'::regclass);


--
-- Name: comments_tags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY comments_tags ALTER COLUMN id SET DEFAULT nextval('comments_tags_id_seq'::regclass);


--
-- Name: communities_posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities_posts ALTER COLUMN id SET DEFAULT nextval('post_community_id_seq'::regclass);


--
-- Name: communities_tags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities_tags ALTER COLUMN id SET DEFAULT nextval('communities_tags_id_seq'::regclass);


--
-- Name: communities_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities_users ALTER COLUMN id SET DEFAULT nextval('users_community_id_seq'::regclass);


--
-- Name: devices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY devices ALTER COLUMN id SET DEFAULT nextval('devices_id_seq'::regclass);


--
-- Name: event_responses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY event_responses ALTER COLUMN id SET DEFAULT nextval('event_responses_id_seq'::regclass);


--
-- Name: join_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY join_requests ALTER COLUMN id SET DEFAULT nextval('join_requests_id_seq'::regclass);


--
-- Name: knex_migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY knex_migrations ALTER COLUMN id SET DEFAULT nextval('knex_migrations_id_seq'::regclass);


--
-- Name: link_previews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY link_previews ALTER COLUMN id SET DEFAULT nextval('link_previews_id_seq'::regclass);


--
-- Name: networks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY networks ALTER COLUMN id SET DEFAULT nextval('networks_id_seq'::regclass);


--
-- Name: nexudus_accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY nexudus_accounts ALTER COLUMN id SET DEFAULT nextval('nexudus_accounts_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY notifications ALTER COLUMN id SET DEFAULT nextval('notifications_id_seq'::regclass);


--
-- Name: posts_tags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY posts_tags ALTER COLUMN id SET DEFAULT nextval('posts_tags_id_seq'::regclass);


--
-- Name: posts_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY posts_users ALTER COLUMN id SET DEFAULT nextval('posts_users_id_seq'::regclass);


--
-- Name: push_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY push_notifications ALTER COLUMN id SET DEFAULT nextval('queued_pushes_id_seq'::regclass);


--
-- Name: tag_follows id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY tag_follows ALTER COLUMN id SET DEFAULT nextval('followed_tags_id_seq'::regclass);


--
-- Name: tags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY tags ALTER COLUMN id SET DEFAULT nextval('tags_id_seq'::regclass);


--
-- Name: tags_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY tags_users ALTER COLUMN id SET DEFAULT nextval('tags_users_id_seq'::regclass);


--
-- Name: user_connections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY user_connections ALTER COLUMN id SET DEFAULT nextval('user_connections_id_seq'::regclass);


--
-- Name: user_external_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY user_external_data ALTER COLUMN id SET DEFAULT nextval('user_external_data_id_seq'::regclass);


--
-- Name: users pk_users; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY users
    ADD CONSTRAINT pk_users PRIMARY KEY (id);


--
-- Name: search_index; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW search_index AS
 SELECT p.id AS post_id,
    NULL::bigint AS user_id,
    NULL::bigint AS comment_id,
    ((setweight(to_tsvector('english'::regconfig, p.name), 'B'::"char") || setweight(to_tsvector('english'::regconfig, COALESCE(p.description, ''::text)), 'C'::"char")) || setweight(to_tsvector('english'::regconfig, (u.name)::text), 'D'::"char")) AS document
   FROM (posts p
     JOIN users u ON ((u.id = p.user_id)))
  WHERE ((p.active = true) AND (u.active = true))
UNION
 SELECT NULL::bigint AS post_id,
    u.id AS user_id,
    NULL::bigint AS comment_id,
    ((setweight(to_tsvector('english'::regconfig, (u.name)::text), 'A'::"char") || setweight(to_tsvector('english'::regconfig, COALESCE(string_agg(replace((t.name)::text, '-'::text, ' '::text), ' '::text), ''::text)), 'C'::"char")) || setweight(to_tsvector('english'::regconfig, COALESCE(u.bio, ''::text)), 'C'::"char")) AS document
   FROM ((users u
     LEFT JOIN tags_users tu ON ((u.id = tu.user_id)))
     LEFT JOIN tags t ON ((tu.tag_id = t.id)))
  WHERE (u.active = true)
  GROUP BY u.id
UNION
 SELECT NULL::bigint AS post_id,
    NULL::bigint AS user_id,
    c.id AS comment_id,
    (setweight(to_tsvector('english'::regconfig, c.text), 'C'::"char") || setweight(to_tsvector('english'::regconfig, (u.name)::text), 'D'::"char")) AS document
   FROM (comments c
     JOIN users u ON ((u.id = c.user_id)))
  WHERE ((c.active = true) AND (u.active = true))
  WITH NO DATA;


--
-- Name: activities activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY activities
    ADD CONSTRAINT activity_pkey PRIMARY KEY (id);


--
-- Name: comments_tags comments_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY comments_tags
    ADD CONSTRAINT comments_tags_pkey PRIMARY KEY (id);


--
-- Name: communities_tags communities_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities_tags
    ADD CONSTRAINT communities_tags_pkey PRIMARY KEY (id);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: event_responses event_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY event_responses
    ADD CONSTRAINT event_responses_pkey PRIMARY KEY (id);


--
-- Name: event_responses event_responses_user_id_post_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY event_responses
    ADD CONSTRAINT event_responses_user_id_post_id_unique UNIQUE (user_id, post_id);


--
-- Name: tag_follows followed_tags_community_id_tag_id_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY tag_follows
    ADD CONSTRAINT followed_tags_community_id_tag_id_user_id_unique UNIQUE (community_id, tag_id, user_id);


--
-- Name: tag_follows followed_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY tag_follows
    ADD CONSTRAINT followed_tags_pkey PRIMARY KEY (id);


--
-- Name: join_requests join_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY join_requests
    ADD CONSTRAINT join_requests_pkey PRIMARY KEY (id);


--
-- Name: knex_migrations knex_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY knex_migrations
    ADD CONSTRAINT knex_migrations_pkey PRIMARY KEY (id);


--
-- Name: link_previews link_previews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY link_previews
    ADD CONSTRAINT link_previews_pkey PRIMARY KEY (id);


--
-- Name: link_previews link_previews_url_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY link_previews
    ADD CONSTRAINT link_previews_url_unique UNIQUE (url);


--
-- Name: networks networks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY networks
    ADD CONSTRAINT networks_pkey PRIMARY KEY (id);


--
-- Name: networks networks_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY networks
    ADD CONSTRAINT networks_slug_unique UNIQUE (slug);


--
-- Name: nexudus_accounts nexudus_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY nexudus_accounts
    ADD CONSTRAINT nexudus_accounts_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: comments pk_comment; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY comments
    ADD CONSTRAINT pk_comment PRIMARY KEY (id);


--
-- Name: communities pk_community; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities
    ADD CONSTRAINT pk_community PRIMARY KEY (id);


--
-- Name: community_invites pk_community_invite; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY community_invites
    ADD CONSTRAINT pk_community_invite PRIMARY KEY (id);


--
-- Name: contributions pk_contributor; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY contributions
    ADD CONSTRAINT pk_contributor PRIMARY KEY (id);


--
-- Name: follows pk_follower; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY follows
    ADD CONSTRAINT pk_follower PRIMARY KEY (id);


--
-- Name: linked_account pk_linked_account; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY linked_account
    ADD CONSTRAINT pk_linked_account PRIMARY KEY (id);


--
-- Name: media pk_media; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY media
    ADD CONSTRAINT pk_media PRIMARY KEY (id);


--
-- Name: posts pk_post; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY posts
    ADD CONSTRAINT pk_post PRIMARY KEY (id);


--
-- Name: thanks pk_thank_you; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY thanks
    ADD CONSTRAINT pk_thank_you PRIMARY KEY (id);


--
-- Name: user_post_relevance pk_user_post_relevance; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY user_post_relevance
    ADD CONSTRAINT pk_user_post_relevance PRIMARY KEY (id);


--
-- Name: votes pk_vote; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY votes
    ADD CONSTRAINT pk_vote PRIMARY KEY (id);


--
-- Name: communities_posts post_community_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities_posts
    ADD CONSTRAINT post_community_pkey PRIMARY KEY (id);


--
-- Name: communities_posts post_community_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities_posts
    ADD CONSTRAINT post_community_unique UNIQUE (post_id, community_id);


--
-- Name: posts_tags posts_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY posts_tags
    ADD CONSTRAINT posts_tags_pkey PRIMARY KEY (id);


--
-- Name: posts_users posts_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY posts_users
    ADD CONSTRAINT posts_users_pkey PRIMARY KEY (id);


--
-- Name: push_notifications queued_pushes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY push_notifications
    ADD CONSTRAINT queued_pushes_pkey PRIMARY KEY (id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: tags_users tags_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY tags_users
    ADD CONSTRAINT tags_users_pkey PRIMARY KEY (id);


--
-- Name: communities unique_beta_access_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities
    ADD CONSTRAINT unique_beta_access_code UNIQUE (beta_access_code);


--
-- Name: comments_tags unique_comments_tags; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY comments_tags
    ADD CONSTRAINT unique_comments_tags UNIQUE (comment_id, tag_id);


--
-- Name: communities_tags unique_communities_tags; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities_tags
    ADD CONSTRAINT unique_communities_tags UNIQUE (community_id, tag_id);


--
-- Name: users unique_email; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY users
    ADD CONSTRAINT unique_email UNIQUE (email);


--
-- Name: follows unique_follows; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY follows
    ADD CONSTRAINT unique_follows UNIQUE (post_id, comment_id, user_id);


--
-- Name: join_requests unique_join_requests; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY join_requests
    ADD CONSTRAINT unique_join_requests UNIQUE (user_id, community_id);


--
-- Name: tags unique_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY tags
    ADD CONSTRAINT unique_name UNIQUE (name);


--
-- Name: posts_tags unique_posts_tags; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY posts_tags
    ADD CONSTRAINT unique_posts_tags UNIQUE (post_id, tag_id);


--
-- Name: tags_users unique_tags_users; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY tags_users
    ADD CONSTRAINT unique_tags_users UNIQUE (tag_id, user_id);


--
-- Name: communities uq_community_1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities
    ADD CONSTRAINT uq_community_1 UNIQUE (name);


--
-- Name: communities uq_community_2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities
    ADD CONSTRAINT uq_community_2 UNIQUE (slug);


--
-- Name: contributions uq_no_multiple_contributor_2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY contributions
    ADD CONSTRAINT uq_no_multiple_contributor_2 UNIQUE (post_id, user_id);


--
-- Name: thanks uq_no_multiple_thankyous_2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY thanks
    ADD CONSTRAINT uq_no_multiple_thankyous_2 UNIQUE (comment_id, user_id, thanked_by_id);


--
-- Name: community_invites uq_no_multiple_tokens; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY community_invites
    ADD CONSTRAINT uq_no_multiple_tokens UNIQUE (token);


--
-- Name: votes uq_vote_1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY votes
    ADD CONSTRAINT uq_vote_1 UNIQUE (user_id, post_id);


--
-- Name: communities_users user_community_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities_users
    ADD CONSTRAINT user_community_unique UNIQUE (user_id, community_id);


--
-- Name: user_connections user_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY user_connections
    ADD CONSTRAINT user_connections_pkey PRIMARY KEY (id);


--
-- Name: user_external_data user_external_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY user_external_data
    ADD CONSTRAINT user_external_data_pkey PRIMARY KEY (id);


--
-- Name: user_post_relevance user_id_post_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY user_post_relevance
    ADD CONSTRAINT user_id_post_id_unique UNIQUE (user_id, post_id);


--
-- Name: communities_users users_community_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities_users
    ADD CONSTRAINT users_community_pkey PRIMARY KEY (id);


--
-- Name: fk_community_created_by_1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fk_community_created_by_1 ON communities USING btree (created_by_id);


--
-- Name: idx_fts_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fts_search ON search_index USING gin (document);


--
-- Name: ix_comment_post_2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_comment_post_2 ON comments USING btree (post_id);


--
-- Name: ix_comment_user_1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_comment_user_1 ON comments USING btree (user_id);


--
-- Name: ix_community_invite_community_1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_community_invite_community_1 ON community_invites USING btree (community_id);


--
-- Name: ix_community_invite_invited_by_3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_community_invite_invited_by_3 ON community_invites USING btree (invited_by_id);


--
-- Name: ix_community_invite_used_by_2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_community_invite_used_by_2 ON community_invites USING btree (used_by_id);


--
-- Name: ix_contributor_post_1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_contributor_post_1 ON contributions USING btree (post_id);


--
-- Name: ix_contributor_user_2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_contributor_user_2 ON contributions USING btree (user_id);


--
-- Name: ix_follower_addedby_3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_follower_addedby_3 ON follows USING btree (added_by_id);


--
-- Name: ix_follower_post_1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_follower_post_1 ON follows USING btree (post_id);


--
-- Name: ix_follower_user_2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_follower_user_2 ON follows USING btree (user_id);


--
-- Name: ix_linked_account_user_4; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_linked_account_user_4 ON linked_account USING btree (user_id);


--
-- Name: ix_media_post_1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_media_post_1 ON media USING btree (post_id);


--
-- Name: ix_post_creator_11; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_post_creator_11 ON posts USING btree (user_id);


--
-- Name: ix_thank_you_comment_1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_thank_you_comment_1 ON thanks USING btree (comment_id);


--
-- Name: ix_thank_you_thanked_by_3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_thank_you_thanked_by_3 ON thanks USING btree (thanked_by_id);


--
-- Name: ix_thank_you_user_2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_thank_you_user_2 ON thanks USING btree (user_id);


--
-- Name: ix_vote_post_14; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_vote_post_14 ON votes USING btree (post_id);


--
-- Name: ix_vote_user_13; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_vote_user_13 ON votes USING btree (user_id);


--
-- Name: activities activities_contribution_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY activities
    ADD CONSTRAINT activities_contribution_id_foreign FOREIGN KEY (contribution_id) REFERENCES contributions(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: activities activities_parent_comment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY activities
    ADD CONSTRAINT activities_parent_comment_id_foreign FOREIGN KEY (parent_comment_id) REFERENCES comments(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: activities activity_actor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY activities
    ADD CONSTRAINT activity_actor_id_foreign FOREIGN KEY (actor_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: activities activity_comment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY activities
    ADD CONSTRAINT activity_comment_id_foreign FOREIGN KEY (comment_id) REFERENCES comments(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: activities activity_community_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY activities
    ADD CONSTRAINT activity_community_id_foreign FOREIGN KEY (community_id) REFERENCES communities(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: activities activity_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY activities
    ADD CONSTRAINT activity_post_id_foreign FOREIGN KEY (post_id) REFERENCES posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: activities activity_reader_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY activities
    ADD CONSTRAINT activity_reader_id_foreign FOREIGN KEY (reader_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: comments comments_comment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY comments
    ADD CONSTRAINT comments_comment_id_foreign FOREIGN KEY (comment_id) REFERENCES comments(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: comments_tags comments_tags_comment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY comments_tags
    ADD CONSTRAINT comments_tags_comment_id_foreign FOREIGN KEY (comment_id) REFERENCES comments(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: comments_tags comments_tags_tag_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY comments_tags
    ADD CONSTRAINT comments_tags_tag_id_foreign FOREIGN KEY (tag_id) REFERENCES tags(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: communities_tags communities_tags_community_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities_tags
    ADD CONSTRAINT communities_tags_community_id_foreign FOREIGN KEY (community_id) REFERENCES communities(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: communities_tags communities_tags_owner_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities_tags
    ADD CONSTRAINT communities_tags_owner_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: communities_tags communities_tags_tag_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities_tags
    ADD CONSTRAINT communities_tags_tag_id_foreign FOREIGN KEY (tag_id) REFERENCES tags(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: community_invites community_invite_tag_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY community_invites
    ADD CONSTRAINT community_invite_tag_id_foreign FOREIGN KEY (tag_id) REFERENCES tags(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: communities community_leader_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities
    ADD CONSTRAINT community_leader_id_foreign FOREIGN KEY (leader_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: communities community_network_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities
    ADD CONSTRAINT community_network_id_foreign FOREIGN KEY (network_id) REFERENCES networks(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: devices devices_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY devices
    ADD CONSTRAINT devices_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: event_responses event_responses_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY event_responses
    ADD CONSTRAINT event_responses_post_id_foreign FOREIGN KEY (post_id) REFERENCES posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: event_responses event_responses_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY event_responses
    ADD CONSTRAINT event_responses_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: comments fk_comment_deactivated_by_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY comments
    ADD CONSTRAINT fk_comment_deactivated_by_01 FOREIGN KEY (deactivated_by_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: comments fk_comment_post_2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY comments
    ADD CONSTRAINT fk_comment_post_2 FOREIGN KEY (post_id) REFERENCES posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: comments fk_comment_user_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY comments
    ADD CONSTRAINT fk_comment_user_1 FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: communities fk_community_created_by_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities
    ADD CONSTRAINT fk_community_created_by_1 FOREIGN KEY (created_by_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: community_invites fk_community_invite_community_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY community_invites
    ADD CONSTRAINT fk_community_invite_community_1 FOREIGN KEY (community_id) REFERENCES communities(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: community_invites fk_community_invite_invited_by_3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY community_invites
    ADD CONSTRAINT fk_community_invite_invited_by_3 FOREIGN KEY (invited_by_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: community_invites fk_community_invite_used_by_2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY community_invites
    ADD CONSTRAINT fk_community_invite_used_by_2 FOREIGN KEY (used_by_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: contributions fk_contributor_post_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY contributions
    ADD CONSTRAINT fk_contributor_post_1 FOREIGN KEY (post_id) REFERENCES posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: contributions fk_contributor_user_2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY contributions
    ADD CONSTRAINT fk_contributor_user_2 FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: follows fk_follower_addedby_3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY follows
    ADD CONSTRAINT fk_follower_addedby_3 FOREIGN KEY (added_by_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: follows fk_follower_post_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY follows
    ADD CONSTRAINT fk_follower_post_1 FOREIGN KEY (post_id) REFERENCES posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: follows fk_follower_user_2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY follows
    ADD CONSTRAINT fk_follower_user_2 FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: linked_account fk_linked_account_user_4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY linked_account
    ADD CONSTRAINT fk_linked_account_user_4 FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: media fk_media_post_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY media
    ADD CONSTRAINT fk_media_post_1 FOREIGN KEY (post_id) REFERENCES posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: communities_posts fk_post_community_community_02; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities_posts
    ADD CONSTRAINT fk_post_community_community_02 FOREIGN KEY (community_id) REFERENCES communities(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: communities_posts fk_post_community_post_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities_posts
    ADD CONSTRAINT fk_post_community_post_01 FOREIGN KEY (post_id) REFERENCES posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: posts fk_post_creator_11; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY posts
    ADD CONSTRAINT fk_post_creator_11 FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: posts fk_post_deactivated_by_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY posts
    ADD CONSTRAINT fk_post_deactivated_by_01 FOREIGN KEY (deactivated_by_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: thanks fk_thank_you_comment_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY thanks
    ADD CONSTRAINT fk_thank_you_comment_1 FOREIGN KEY (comment_id) REFERENCES comments(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: thanks fk_thank_you_thanked_by_3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY thanks
    ADD CONSTRAINT fk_thank_you_thanked_by_3 FOREIGN KEY (thanked_by_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: thanks fk_thank_you_user_2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY thanks
    ADD CONSTRAINT fk_thank_you_user_2 FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: user_post_relevance fk_upr_post_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY user_post_relevance
    ADD CONSTRAINT fk_upr_post_1 FOREIGN KEY (post_id) REFERENCES posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: user_post_relevance fk_upr_user_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY user_post_relevance
    ADD CONSTRAINT fk_upr_user_1 FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: communities_users fk_users_community_community_02; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities_users
    ADD CONSTRAINT fk_users_community_community_02 FOREIGN KEY (community_id) REFERENCES communities(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: communities_users fk_users_community_users_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities_users
    ADD CONSTRAINT fk_users_community_users_01 FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: votes fk_vote_post_14; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY votes
    ADD CONSTRAINT fk_vote_post_14 FOREIGN KEY (post_id) REFERENCES posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: votes fk_vote_user_13; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY votes
    ADD CONSTRAINT fk_vote_user_13 FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: tag_follows followed_tags_community_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY tag_follows
    ADD CONSTRAINT followed_tags_community_id_foreign FOREIGN KEY (community_id) REFERENCES communities(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: tag_follows followed_tags_tag_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY tag_follows
    ADD CONSTRAINT followed_tags_tag_id_foreign FOREIGN KEY (tag_id) REFERENCES tags(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: tag_follows followed_tags_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY tag_follows
    ADD CONSTRAINT followed_tags_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: follows follows_comment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY follows
    ADD CONSTRAINT follows_comment_id_foreign FOREIGN KEY (comment_id) REFERENCES comments(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: join_requests join_requests_community_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY join_requests
    ADD CONSTRAINT join_requests_community_id_foreign FOREIGN KEY (community_id) REFERENCES communities(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: join_requests join_requests_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY join_requests
    ADD CONSTRAINT join_requests_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: media media_comment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY media
    ADD CONSTRAINT media_comment_id_foreign FOREIGN KEY (comment_id) REFERENCES comments(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: nexudus_accounts nexudus_accounts_community_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY nexudus_accounts
    ADD CONSTRAINT nexudus_accounts_community_id_foreign FOREIGN KEY (community_id) REFERENCES communities(id);


--
-- Name: notifications notifications_activity_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY notifications
    ADD CONSTRAINT notifications_activity_id_foreign FOREIGN KEY (activity_id) REFERENCES activities(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: posts post_link_preview_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY posts
    ADD CONSTRAINT post_link_preview_id_foreign FOREIGN KEY (link_preview_id) REFERENCES link_previews(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: posts post_parent_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY posts
    ADD CONSTRAINT post_parent_post_id_foreign FOREIGN KEY (parent_post_id) REFERENCES posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: posts_about_users posts_about_users_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY posts_about_users
    ADD CONSTRAINT posts_about_users_post_id_foreign FOREIGN KEY (post_id) REFERENCES posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: posts_about_users posts_about_users_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY posts_about_users
    ADD CONSTRAINT posts_about_users_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: posts_tags posts_tags_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY posts_tags
    ADD CONSTRAINT posts_tags_post_id_foreign FOREIGN KEY (post_id) REFERENCES posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: posts_tags posts_tags_tag_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY posts_tags
    ADD CONSTRAINT posts_tags_tag_id_foreign FOREIGN KEY (tag_id) REFERENCES tags(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: posts_users posts_users_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY posts_users
    ADD CONSTRAINT posts_users_post_id_foreign FOREIGN KEY (post_id) REFERENCES posts(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: posts_users posts_users_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY posts_users
    ADD CONSTRAINT posts_users_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: tags_users tags_users_tag_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY tags_users
    ADD CONSTRAINT tags_users_tag_id_foreign FOREIGN KEY (tag_id) REFERENCES tags(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: tags_users tags_users_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY tags_users
    ADD CONSTRAINT tags_users_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: user_connections user_connections_other_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY user_connections
    ADD CONSTRAINT user_connections_other_user_id_foreign FOREIGN KEY (other_user_id) REFERENCES users(id);


--
-- Name: user_connections user_connections_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY user_connections
    ADD CONSTRAINT user_connections_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id);


--
-- Name: user_external_data user_external_data_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY user_external_data
    ADD CONSTRAINT user_external_data_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: communities_users users_community_deactivator_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY communities_users
    ADD CONSTRAINT users_community_deactivator_id_foreign FOREIGN KEY (deactivator_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- PostgreSQL database dump complete
--

