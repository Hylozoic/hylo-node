--
-- PostgreSQL database dump
--

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
-- Name: activity; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE activity (
    id integer NOT NULL,
    actor_id bigint,
    reader_id bigint,
    post_id bigint,
    comment_id bigint,
    action character varying(255),
    unread boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
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

ALTER SEQUENCE activity_id_seq OWNED BY activity.id;


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
-- Name: comment; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE comment (
    id bigint DEFAULT nextval('comment_seq'::regclass) NOT NULL,
    user_id bigint,
    post_id bigint,
    created_at timestamp without time zone,
    comment_text text,
    active boolean,
    deactivated_reason character varying(255),
    deactivated_by_id bigint,
    deactivated_on timestamp without time zone
);


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
-- Name: community; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE community (
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
    created_at date,
    created_by_id bigint,
    banner_pos character varying(32),
    leader_id bigint,
    welcome_message text,
    settings json DEFAULT '{}'::json,
    allow_public_content boolean DEFAULT false,
    default_public_content boolean DEFAULT false,
    network_id bigint
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
-- Name: community_invite; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE community_invite (
    id bigint DEFAULT nextval('community_invite_seq'::regclass) NOT NULL,
    community_id bigint NOT NULL,
    created timestamp without time zone NOT NULL,
    invited_by_id bigint NOT NULL,
    used_by_id bigint,
    token text NOT NULL,
    used_on timestamp without time zone,
    email text NOT NULL,
    role smallint DEFAULT 0
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
-- Name: contributor; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE contributor (
    id bigint DEFAULT nextval('contributor_seq'::regclass) NOT NULL,
    post_id bigint NOT NULL,
    user_id bigint NOT NULL,
    date_contributed timestamp without time zone NOT NULL
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
-- Name: device; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE device (
    id bigint DEFAULT nextval('device_seq'::regclass) NOT NULL,
    user_id bigint NOT NULL,
    token character varying(255) NOT NULL,
    added timestamp without time zone
);


--
-- Name: devices; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE devices (
    id integer NOT NULL,
    user_id bigint,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    badge_no integer DEFAULT 0,
    token character varying(255),
    enabled boolean DEFAULT true
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
-- Name: emails; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE emails (
    id integer NOT NULL,
    user_id bigint,
    value character varying(255)
);


--
-- Name: emails_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE emails_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: emails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE emails_id_seq OWNED BY emails.id;


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
-- Name: follower; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE follower (
    id bigint DEFAULT nextval('follower_seq'::regclass) NOT NULL,
    post_id bigint,
    date_added timestamp without time zone,
    user_id bigint,
    added_by_id bigint
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
-- Name: invite_request; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE invite_request (
    id bigint DEFAULT nextval('invite_request_seq'::regclass) NOT NULL,
    user_id bigint,
    community character varying(255),
    about text,
    url character varying(255),
    name text,
    email text
);


--
-- Name: knex_migrations; Type: TABLE; Schema: public; Owner: -; Tablespace: 
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
-- Name: linked_account_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE linked_account_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: linked_account; Type: TABLE; Schema: public; Owner: -; Tablespace: 
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
-- Name: media; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE media (
    id bigint DEFAULT nextval('media_seq'::regclass) NOT NULL,
    type character varying(255),
    url character varying(255),
    thumbnail_url character varying(255),
    created_at timestamp without time zone,
    post_id bigint
);


--
-- Name: networks; Type: TABLE; Schema: public; Owner: -; Tablespace: 
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
-- Name: notification_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE notification_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE notification (
    id bigint DEFAULT nextval('notification_seq'::regclass) NOT NULL,
    post_id bigint,
    comment_id bigint,
    vote_id bigint,
    actor_id bigint,
    "timestamp" timestamp without time zone,
    type character varying(1),
    processed boolean,
    CONSTRAINT ck_notification_type CHECK (((type)::text = ANY (ARRAY[('V'::character varying)::text, ('C'::character varying)::text])))
);


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
-- Name: notification_status; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE notification_status (
    id bigint DEFAULT nextval('notification_status_seq'::regclass) NOT NULL,
    recipient_id bigint,
    notification_id bigint,
    read boolean,
    date_read timestamp without time zone,
    sent_email_notification boolean
);


--
-- Name: org; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE org (
    name character varying(255) NOT NULL,
    date_introduced timestamp without time zone
);


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
-- Name: phones; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE phones (
    id integer NOT NULL,
    user_id bigint,
    value character varying(255)
);


--
-- Name: phones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE phones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: phones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE phones_id_seq OWNED BY phones.id;


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
-- Name: post; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE post (
    id bigint DEFAULT nextval('post_seq'::regclass) NOT NULL,
    name text,
    description text,
    type character varying(255),
    image_url character varying(255),
    thumbnail_image_url character varying(255),
    created_at timestamp without time zone,
    creator_id bigint,
    num_votes integer,
    num_comments integer,
    active boolean,
    deactivated_by_id bigint,
    deactivated_on timestamp without time zone,
    deactivated_reason character varying(255),
    fulfilled_at timestamp without time zone,
    updated_at timestamp without time zone,
    edited boolean,
    edited_timestamp date,
    visibility integer DEFAULT 0
);


--
-- Name: post_community; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE post_community (
    post_id bigint NOT NULL,
    community_id bigint NOT NULL
);


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
-- Name: post_view; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE post_view (
    id bigint DEFAULT nextval('post_view_seq'::regclass) NOT NULL,
    "timestamp" timestamp without time zone
);


--
-- Name: posts_about_users; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE posts_about_users (
    post_id bigint,
    user_id bigint
);


--
-- Name: posts_projects; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE posts_projects (
    id integer NOT NULL,
    post_id bigint NOT NULL,
    project_id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: posts_projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE posts_projects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: posts_projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE posts_projects_id_seq OWNED BY posts_projects.id;


--
-- Name: project_invitations; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE project_invitations (
    id integer NOT NULL,
    email character varying(255),
    user_id bigint,
    project_id bigint NOT NULL,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    token character varying(255)
);


--
-- Name: project_invitations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE project_invitations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_invitations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE project_invitations_id_seq OWNED BY project_invitations.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE projects (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    intention character varying(255),
    details text,
    user_id bigint,
    community_id bigint,
    visibility integer,
    image_url character varying(255),
    video_url character varying(255),
    published_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    slug character varying(255) NOT NULL,
    thumbnail_url character varying(255)
);


--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE projects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE projects_id_seq OWNED BY projects.id;


--
-- Name: projects_users; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE projects_users (
    id integer NOT NULL,
    project_id bigint NOT NULL,
    user_id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    notify_on_new_posts boolean DEFAULT true
);


--
-- Name: projects_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE projects_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: projects_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE projects_users_id_seq OWNED BY projects_users.id;


--
-- Name: push_notifications; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE push_notifications (
    id integer NOT NULL,
    device_token character varying(255),
    payload character varying(255),
    time_queued timestamp with time zone,
    time_sent timestamp with time zone,
    alert character varying(255) DEFAULT ''::character varying,
    badge_no integer DEFAULT 0
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
-- Name: skill; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE skill (
    name character varying(255) NOT NULL,
    date_introduced timestamp without time zone
);


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
-- Name: thank_you_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE thank_you_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: thank_you; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE thank_you (
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
-- Name: token_action; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE token_action (
    id bigint DEFAULT nextval('token_action_seq'::regclass) NOT NULL,
    token character varying(255),
    target_user_id bigint,
    type character varying(2),
    created timestamp without time zone,
    expires timestamp without time zone,
    CONSTRAINT ck_token_action_type CHECK (((type)::text = ANY (ARRAY[('EV'::character varying)::text, ('PR'::character varying)::text])))
);


--
-- Name: tours; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE tours (
    id integer NOT NULL,
    user_id bigint,
    type character varying(255),
    status json,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: tours_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE tours_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tours_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE tours_id_seq OWNED BY tours.id;


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
-- Name: user_permission; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE user_permission (
    id bigint DEFAULT nextval('user_permission_seq'::regclass) NOT NULL,
    value character varying(255)
);


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
-- Name: user_post_relevance; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE user_post_relevance (
    id bigint DEFAULT nextval('user_post_relevance_seq'::regclass) NOT NULL,
    user_id bigint,
    post_id bigint,
    similarity real,
    updated_date timestamp without time zone
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
-- Name: users; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE users (
    id bigint DEFAULT nextval('users_seq'::regclass) NOT NULL,
    email character varying(255),
    name character varying(255),
    avatar_url character varying(255),
    first_name character varying(255),
    last_name character varying(255),
    last_login timestamp without time zone,
    active boolean,
    email_validated boolean,
    created_at timestamp without time zone,
    date_deactivated timestamp without time zone,
    send_email_preference boolean,
    profile_tour boolean DEFAULT true,
    community_tour boolean DEFAULT true,
    finished_onboarding boolean,
    daily_digest boolean,
    credit_card_last4 character varying(5),
    balanced_customer_id character varying(63),
    billy_customer_id character varying(63),
    balanced_card_id character varying(63),
    bio text,
    banner_url character varying(255),
    twitter_name character varying(255),
    linkedin_url character varying(255),
    facebook_url character varying(255),
    work text,
    intention text,
    extra_info text,
    new_notification_count integer DEFAULT 0
);


--
-- Name: users_community; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE users_community (
    user_id bigint NOT NULL,
    community_id bigint NOT NULL,
    role smallint,
    created_at timestamp without time zone,
    active boolean,
    deactivated_at timestamp with time zone,
    deactivator_id bigint,
    last_viewed_at timestamp with time zone
);


--
-- Name: users_org; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE users_org (
    user_id bigint NOT NULL,
    org_name character varying(255) NOT NULL
);


--
-- Name: users_skill; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE users_skill (
    user_id bigint NOT NULL,
    skill_name character varying(255) NOT NULL
);


--
-- Name: users_user_permission; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE users_user_permission (
    users_id bigint NOT NULL,
    user_permission_id bigint NOT NULL
);


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
-- Name: vote; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE vote (
    id bigint DEFAULT nextval('vote_seq'::regclass) NOT NULL,
    user_id bigint,
    post_id bigint,
    date_voted timestamp without time zone
);


--
-- Name: websites; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE websites (
    id integer NOT NULL,
    user_id bigint,
    value character varying(255)
);


--
-- Name: websites_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE websites_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: websites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE websites_id_seq OWNED BY websites.id;


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY activity ALTER COLUMN id SET DEFAULT nextval('activity_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY devices ALTER COLUMN id SET DEFAULT nextval('devices_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY emails ALTER COLUMN id SET DEFAULT nextval('emails_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY knex_migrations ALTER COLUMN id SET DEFAULT nextval('knex_migrations_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY networks ALTER COLUMN id SET DEFAULT nextval('networks_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY phones ALTER COLUMN id SET DEFAULT nextval('phones_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY posts_projects ALTER COLUMN id SET DEFAULT nextval('posts_projects_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY project_invitations ALTER COLUMN id SET DEFAULT nextval('project_invitations_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY projects ALTER COLUMN id SET DEFAULT nextval('projects_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY projects_users ALTER COLUMN id SET DEFAULT nextval('projects_users_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY push_notifications ALTER COLUMN id SET DEFAULT nextval('queued_pushes_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY tours ALTER COLUMN id SET DEFAULT nextval('tours_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY websites ALTER COLUMN id SET DEFAULT nextval('websites_id_seq'::regclass);


--
-- Name: activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY activity
    ADD CONSTRAINT activity_pkey PRIMARY KEY (id);


--
-- Name: devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY emails
    ADD CONSTRAINT emails_pkey PRIMARY KEY (id);


--
-- Name: knex_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY knex_migrations
    ADD CONSTRAINT knex_migrations_pkey PRIMARY KEY (id);


--
-- Name: networks_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY networks
    ADD CONSTRAINT networks_pkey PRIMARY KEY (id);


--
-- Name: networks_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY networks
    ADD CONSTRAINT networks_slug_unique UNIQUE (slug);


--
-- Name: phones_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY phones
    ADD CONSTRAINT phones_pkey PRIMARY KEY (id);


--
-- Name: pk_comment; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY comment
    ADD CONSTRAINT pk_comment PRIMARY KEY (id);


--
-- Name: pk_community; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY community
    ADD CONSTRAINT pk_community PRIMARY KEY (id);


--
-- Name: pk_community_invite; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY community_invite
    ADD CONSTRAINT pk_community_invite PRIMARY KEY (id);


--
-- Name: pk_contributor; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY contributor
    ADD CONSTRAINT pk_contributor PRIMARY KEY (id);


--
-- Name: pk_device; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY device
    ADD CONSTRAINT pk_device PRIMARY KEY (id);


--
-- Name: pk_follower; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY follower
    ADD CONSTRAINT pk_follower PRIMARY KEY (id);


--
-- Name: pk_invite_request; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY invite_request
    ADD CONSTRAINT pk_invite_request PRIMARY KEY (id);


--
-- Name: pk_linked_account; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY linked_account
    ADD CONSTRAINT pk_linked_account PRIMARY KEY (id);


--
-- Name: pk_media; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY media
    ADD CONSTRAINT pk_media PRIMARY KEY (id);


--
-- Name: pk_notification; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY notification
    ADD CONSTRAINT pk_notification PRIMARY KEY (id);


--
-- Name: pk_notification_status; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY notification_status
    ADD CONSTRAINT pk_notification_status PRIMARY KEY (id);


--
-- Name: pk_org; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY org
    ADD CONSTRAINT pk_org PRIMARY KEY (name);


--
-- Name: pk_post; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY post
    ADD CONSTRAINT pk_post PRIMARY KEY (id);


--
-- Name: pk_post_community; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY post_community
    ADD CONSTRAINT pk_post_community PRIMARY KEY (post_id, community_id);


--
-- Name: pk_post_view; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY post_view
    ADD CONSTRAINT pk_post_view PRIMARY KEY (id);


--
-- Name: pk_skill; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY skill
    ADD CONSTRAINT pk_skill PRIMARY KEY (name);


--
-- Name: pk_thank_you; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY thank_you
    ADD CONSTRAINT pk_thank_you PRIMARY KEY (id);


--
-- Name: pk_token_action; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY token_action
    ADD CONSTRAINT pk_token_action PRIMARY KEY (id);


--
-- Name: pk_user_permission; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY user_permission
    ADD CONSTRAINT pk_user_permission PRIMARY KEY (id);


--
-- Name: pk_user_post_relevance; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY user_post_relevance
    ADD CONSTRAINT pk_user_post_relevance PRIMARY KEY (id);


--
-- Name: pk_users; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY users
    ADD CONSTRAINT pk_users PRIMARY KEY (id);


--
-- Name: pk_users_community; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY users_community
    ADD CONSTRAINT pk_users_community PRIMARY KEY (user_id, community_id);


--
-- Name: pk_users_org; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY users_org
    ADD CONSTRAINT pk_users_org PRIMARY KEY (user_id, org_name);


--
-- Name: pk_users_skill; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY users_skill
    ADD CONSTRAINT pk_users_skill PRIMARY KEY (user_id, skill_name);


--
-- Name: pk_users_user_permission; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY users_user_permission
    ADD CONSTRAINT pk_users_user_permission PRIMARY KEY (users_id, user_permission_id);


--
-- Name: pk_vote; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY vote
    ADD CONSTRAINT pk_vote PRIMARY KEY (id);


--
-- Name: posts_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY posts_projects
    ADD CONSTRAINT posts_projects_pkey PRIMARY KEY (id);


--
-- Name: project_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY project_invitations
    ADD CONSTRAINT project_invitations_pkey PRIMARY KEY (id);


--
-- Name: projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: projects_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY projects
    ADD CONSTRAINT projects_slug_unique UNIQUE (slug);


--
-- Name: projects_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY projects_users
    ADD CONSTRAINT projects_users_pkey PRIMARY KEY (id);


--
-- Name: queued_pushes_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY push_notifications
    ADD CONSTRAINT queued_pushes_pkey PRIMARY KEY (id);


--
-- Name: tours_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY tours
    ADD CONSTRAINT tours_pkey PRIMARY KEY (id);


--
-- Name: unique_email; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY users
    ADD CONSTRAINT unique_email UNIQUE (email);


--
-- Name: unique_posts_projects; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY posts_projects
    ADD CONSTRAINT unique_posts_projects UNIQUE (post_id, project_id);


--
-- Name: unique_projects_users; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY projects_users
    ADD CONSTRAINT unique_projects_users UNIQUE (user_id, project_id);


--
-- Name: unique_user_id_type; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY tours
    ADD CONSTRAINT unique_user_id_type UNIQUE (user_id, type);


--
-- Name: uq_community_1; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY community
    ADD CONSTRAINT uq_community_1 UNIQUE (name);


--
-- Name: uq_community_2; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY community
    ADD CONSTRAINT uq_community_2 UNIQUE (slug);


--
-- Name: uq_no_multiple_contributor_2; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY contributor
    ADD CONSTRAINT uq_no_multiple_contributor_2 UNIQUE (post_id, user_id);


--
-- Name: uq_no_multiple_followers_2; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY follower
    ADD CONSTRAINT uq_no_multiple_followers_2 UNIQUE (post_id, user_id);


--
-- Name: uq_no_multiple_thankyous_2; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY thank_you
    ADD CONSTRAINT uq_no_multiple_thankyous_2 UNIQUE (comment_id, user_id, thanked_by_id);


--
-- Name: uq_no_multiple_tokens; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY community_invite
    ADD CONSTRAINT uq_no_multiple_tokens UNIQUE (token);


--
-- Name: uq_token_action_token; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY token_action
    ADD CONSTRAINT uq_token_action_token UNIQUE (token);


--
-- Name: uq_vote_1; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY vote
    ADD CONSTRAINT uq_vote_1 UNIQUE (user_id, post_id);


--
-- Name: websites_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY websites
    ADD CONSTRAINT websites_pkey PRIMARY KEY (id);


--
-- Name: fk_community_created_by_1; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX fk_community_created_by_1 ON community USING btree (created_by_id);


--
-- Name: ix_comment_post_2; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_comment_post_2 ON comment USING btree (post_id);


--
-- Name: ix_comment_user_1; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_comment_user_1 ON comment USING btree (user_id);


--
-- Name: ix_community_invite_community_1; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_community_invite_community_1 ON community_invite USING btree (community_id);


--
-- Name: ix_community_invite_invited_by_3; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_community_invite_invited_by_3 ON community_invite USING btree (invited_by_id);


--
-- Name: ix_community_invite_used_by_2; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_community_invite_used_by_2 ON community_invite USING btree (used_by_id);


--
-- Name: ix_contributor_post_1; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_contributor_post_1 ON contributor USING btree (post_id);


--
-- Name: ix_contributor_user_2; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_contributor_user_2 ON contributor USING btree (user_id);


--
-- Name: ix_device_users_1; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_device_users_1 ON device USING btree (user_id);


--
-- Name: ix_follower_addedby_3; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_follower_addedby_3 ON follower USING btree (added_by_id);


--
-- Name: ix_follower_post_1; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_follower_post_1 ON follower USING btree (post_id);


--
-- Name: ix_follower_user_2; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_follower_user_2 ON follower USING btree (user_id);


--
-- Name: ix_invite_request_user_3; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_invite_request_user_3 ON invite_request USING btree (user_id);


--
-- Name: ix_linked_account_user_4; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_linked_account_user_4 ON linked_account USING btree (user_id);


--
-- Name: ix_media_post_1; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_media_post_1 ON media USING btree (post_id);


--
-- Name: ix_notification_actor_8; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_notification_actor_8 ON notification USING btree (actor_id);


--
-- Name: ix_notification_comment_6; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_notification_comment_6 ON notification USING btree (comment_id);


--
-- Name: ix_notification_post_5; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_notification_post_5 ON notification USING btree (post_id);


--
-- Name: ix_notification_status_notifi_10; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_notification_status_notifi_10 ON notification_status USING btree (notification_id);


--
-- Name: ix_notification_status_recipie_9; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_notification_status_recipie_9 ON notification_status USING btree (recipient_id);


--
-- Name: ix_notification_vote_7; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_notification_vote_7 ON notification USING btree (vote_id);


--
-- Name: ix_post_creator_11; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_post_creator_11 ON post USING btree (creator_id);


--
-- Name: ix_thank_you_comment_1; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_thank_you_comment_1 ON thank_you USING btree (comment_id);


--
-- Name: ix_thank_you_thanked_by_3; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_thank_you_thanked_by_3 ON thank_you USING btree (thanked_by_id);


--
-- Name: ix_thank_you_user_2; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_thank_you_user_2 ON thank_you USING btree (user_id);


--
-- Name: ix_token_action_targetuser_12; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_token_action_targetuser_12 ON token_action USING btree (target_user_id);


--
-- Name: ix_vote_post_14; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_vote_post_14 ON vote USING btree (post_id);


--
-- Name: ix_vote_user_13; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX ix_vote_user_13 ON vote USING btree (user_id);


--
-- Name: activity_actor_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY activity
    ADD CONSTRAINT activity_actor_id_foreign FOREIGN KEY (actor_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: activity_comment_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY activity
    ADD CONSTRAINT activity_comment_id_foreign FOREIGN KEY (comment_id) REFERENCES comment(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: activity_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY activity
    ADD CONSTRAINT activity_post_id_foreign FOREIGN KEY (post_id) REFERENCES post(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: activity_reader_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY activity
    ADD CONSTRAINT activity_reader_id_foreign FOREIGN KEY (reader_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: community_leader_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY community
    ADD CONSTRAINT community_leader_id_foreign FOREIGN KEY (leader_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: community_network_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY community
    ADD CONSTRAINT community_network_id_foreign FOREIGN KEY (network_id) REFERENCES networks(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: devices_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY devices
    ADD CONSTRAINT devices_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: emails_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY emails
    ADD CONSTRAINT emails_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_comment_deactivated_by_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY comment
    ADD CONSTRAINT fk_comment_deactivated_by_01 FOREIGN KEY (deactivated_by_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_comment_post_2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY comment
    ADD CONSTRAINT fk_comment_post_2 FOREIGN KEY (post_id) REFERENCES post(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_comment_user_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY comment
    ADD CONSTRAINT fk_comment_user_1 FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_community_created_by_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY community
    ADD CONSTRAINT fk_community_created_by_1 FOREIGN KEY (created_by_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_community_invite_community_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY community_invite
    ADD CONSTRAINT fk_community_invite_community_1 FOREIGN KEY (community_id) REFERENCES community(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_community_invite_invited_by_3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY community_invite
    ADD CONSTRAINT fk_community_invite_invited_by_3 FOREIGN KEY (invited_by_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_community_invite_used_by_2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY community_invite
    ADD CONSTRAINT fk_community_invite_used_by_2 FOREIGN KEY (used_by_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_contributor_post_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY contributor
    ADD CONSTRAINT fk_contributor_post_1 FOREIGN KEY (post_id) REFERENCES post(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_contributor_user_2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY contributor
    ADD CONSTRAINT fk_contributor_user_2 FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_device_users_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY device
    ADD CONSTRAINT fk_device_users_1 FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_follower_addedby_3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY follower
    ADD CONSTRAINT fk_follower_addedby_3 FOREIGN KEY (added_by_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_follower_post_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY follower
    ADD CONSTRAINT fk_follower_post_1 FOREIGN KEY (post_id) REFERENCES post(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_follower_user_2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY follower
    ADD CONSTRAINT fk_follower_user_2 FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_invite_request_user_3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY invite_request
    ADD CONSTRAINT fk_invite_request_user_3 FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_linked_account_user_4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY linked_account
    ADD CONSTRAINT fk_linked_account_user_4 FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_media_post_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY media
    ADD CONSTRAINT fk_media_post_1 FOREIGN KEY (post_id) REFERENCES post(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_notification_actor_8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY notification
    ADD CONSTRAINT fk_notification_actor_8 FOREIGN KEY (actor_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_notification_comment_6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY notification
    ADD CONSTRAINT fk_notification_comment_6 FOREIGN KEY (comment_id) REFERENCES comment(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_notification_post_5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY notification
    ADD CONSTRAINT fk_notification_post_5 FOREIGN KEY (post_id) REFERENCES post(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_notification_status_notifi_10; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY notification_status
    ADD CONSTRAINT fk_notification_status_notifi_10 FOREIGN KEY (notification_id) REFERENCES notification(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_notification_status_recipie_9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY notification_status
    ADD CONSTRAINT fk_notification_status_recipie_9 FOREIGN KEY (recipient_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_notification_vote_7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY notification
    ADD CONSTRAINT fk_notification_vote_7 FOREIGN KEY (vote_id) REFERENCES vote(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_post_community_community_02; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY post_community
    ADD CONSTRAINT fk_post_community_community_02 FOREIGN KEY (community_id) REFERENCES community(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_post_community_post_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY post_community
    ADD CONSTRAINT fk_post_community_post_01 FOREIGN KEY (post_id) REFERENCES post(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_post_creator_11; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY post
    ADD CONSTRAINT fk_post_creator_11 FOREIGN KEY (creator_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_post_deactivated_by_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY post
    ADD CONSTRAINT fk_post_deactivated_by_01 FOREIGN KEY (deactivated_by_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_thank_you_comment_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY thank_you
    ADD CONSTRAINT fk_thank_you_comment_1 FOREIGN KEY (comment_id) REFERENCES comment(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_thank_you_thanked_by_3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY thank_you
    ADD CONSTRAINT fk_thank_you_thanked_by_3 FOREIGN KEY (thanked_by_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_thank_you_user_2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY thank_you
    ADD CONSTRAINT fk_thank_you_user_2 FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_token_action_targetuser_12; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY token_action
    ADD CONSTRAINT fk_token_action_targetuser_12 FOREIGN KEY (target_user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_upr_post_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY user_post_relevance
    ADD CONSTRAINT fk_upr_post_1 FOREIGN KEY (post_id) REFERENCES post(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_upr_user_1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY user_post_relevance
    ADD CONSTRAINT fk_upr_user_1 FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_users_community_community_02; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY users_community
    ADD CONSTRAINT fk_users_community_community_02 FOREIGN KEY (community_id) REFERENCES community(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_users_community_users_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY users_community
    ADD CONSTRAINT fk_users_community_users_01 FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_users_org_users_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY users_org
    ADD CONSTRAINT fk_users_org_users_01 FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_users_skill_users_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY users_skill
    ADD CONSTRAINT fk_users_skill_users_01 FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_users_user_permission_user_01; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY users_user_permission
    ADD CONSTRAINT fk_users_user_permission_user_01 FOREIGN KEY (users_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_users_user_permission_user_02; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY users_user_permission
    ADD CONSTRAINT fk_users_user_permission_user_02 FOREIGN KEY (user_permission_id) REFERENCES user_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_vote_post_14; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY vote
    ADD CONSTRAINT fk_vote_post_14 FOREIGN KEY (post_id) REFERENCES post(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_vote_user_13; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY vote
    ADD CONSTRAINT fk_vote_user_13 FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: phones_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY phones
    ADD CONSTRAINT phones_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: posts_about_users_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY posts_about_users
    ADD CONSTRAINT posts_about_users_post_id_foreign FOREIGN KEY (post_id) REFERENCES post(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: posts_about_users_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY posts_about_users
    ADD CONSTRAINT posts_about_users_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: posts_projects_post_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY posts_projects
    ADD CONSTRAINT posts_projects_post_id_foreign FOREIGN KEY (post_id) REFERENCES post(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: posts_projects_project_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY posts_projects
    ADD CONSTRAINT posts_projects_project_id_foreign FOREIGN KEY (project_id) REFERENCES projects(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: project_invitations_project_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY project_invitations
    ADD CONSTRAINT project_invitations_project_id_foreign FOREIGN KEY (project_id) REFERENCES projects(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: project_invitations_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY project_invitations
    ADD CONSTRAINT project_invitations_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: projects_community_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY projects
    ADD CONSTRAINT projects_community_id_foreign FOREIGN KEY (community_id) REFERENCES community(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: projects_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY projects
    ADD CONSTRAINT projects_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: projects_users_project_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY projects_users
    ADD CONSTRAINT projects_users_project_id_foreign FOREIGN KEY (project_id) REFERENCES projects(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: projects_users_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY projects_users
    ADD CONSTRAINT projects_users_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: tours_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY tours
    ADD CONSTRAINT tours_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: users_community_deactivator_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY users_community
    ADD CONSTRAINT users_community_deactivator_id_foreign FOREIGN KEY (deactivator_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: websites_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY websites
    ADD CONSTRAINT websites_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;


--
-- PostgreSQL database dump complete
--

