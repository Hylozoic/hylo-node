import "../../../test/setup";
import factories from "../../../test/setup/factories";
import {
  createProject,
  createProjectRole,
  deleteProjectRole,
  addPeopleToProjectRole,
  joinProject,
  leaveProject,
  createStripePaymentNotifications,
} from "./project";
import mockRequire from "mock-require";

describe("createProject", () => {
  let user, user2, community;

  before(function () {
    user = factories.user();
    user2 = factories.user();
    community = factories.community();
    return Promise.join(community.save(), user.save(), user2.save()).then(() =>
      user.joinCommunity(community)
    );
  });

  it("creates a post with project type, adding members and creator as member", async () => {
    const data = {
      title: "abc",
      communityIds: [community.id],
      memberIds: [user2.id],
    };
    const post = await createProject(user.id, data);
    const project = await Post.find(post.id);
    expect(project.get("type")).to.equal(Post.Type.PROJECT);
    const members = await project.members().fetch();
    expect(members.length).to.equal(2);
    expect(members.map((m) => m.id).sort()).to.deep.equal(
      [user.id, user2.id].sort()
    );
  });
});

describe("createProjectRole", () => {
  let user, project;

  before(async function () {
    user = factories.user();
    await user.save();
    project = factories.post({ type: Post.Type.PROJECT, user_id: user.id });
    await project.save();
  });

  it("creates a project role", async () => {
    const roleName = "Founder";
    await createProjectRole(user.id, project.id, roleName);
    const projectRole = await ProjectRole.where({ name: roleName }).fetch();
    expect(projectRole).to.exist;
    expect(projectRole.get("post_id")).to.equal(project.id);
  });
});

describe("deleteProjectRole", () => {
  let user, project, projectRole;

  before(async function () {
    user = factories.user();
    await user.save();
    project = factories.post({ type: Post.Type.PROJECT, user_id: user.id });
    await project.save();
    projectRole = new ProjectRole({ post_id: project.id, name: "Founder" });
    await projectRole.save();
  });

  it("creates a project role", async () => {
    await deleteProjectRole(user.id, projectRole.id);
    const fetchedProjectRole = await ProjectRole.find(projectRole.id);
    expect(fetchedProjectRole).not.to.exist;
  });
});

describe("addPeopleToProjectRole", () => {
  let user, user2, community, projectRole, project;

  before(async function () {
    user = factories.user();
    await user.save();
    user2 = factories.user();
    await user2.save();
    community = factories.community();
    await community.save();
    await user.joinCommunity(community);
    await user2.joinCommunity(community);
    project = factories.post({ type: Post.Type.PROJECT, user_id: user.id });
    await project.save();
    projectRole = new ProjectRole({ post_id: project.id, name: "Founder" });
    await projectRole.save();
  });

  it("sets the group memberships to the user ids", async () => {
    await addPeopleToProjectRole(user.id, [user2.id], projectRole.id);
    const gm = await GroupMembership.forPair(user2.id, project).fetch();
    expect(gm.get("project_role_id")).to.equal(projectRole.id);
  });
});

describe("joinProject", () => {
  let user, project;

  before(async function () {
    user = factories.user();
    await user.save();
    project = factories.post({ type: Post.Type.PROJECT });
    await project.save();
  });

  it("adds a user to a project", async () => {
    await joinProject(project.id, user.id);
    const members = await project.members().fetch();
    expect(members.length).to.equal(1);
    expect(members.first().id).to.equal(user.id);
  });
});

describe("leaveProject", () => {
  let user, project;

  before(async function () {
    user = factories.user();
    await user.save();
    project = factories.post({ type: Post.Type.PROJECT });
    await project.save();
    await project.addProjectMembers([user.id]);
  });

  it("removes a user from a project", async () => {
    await leaveProject(project.id, user.id);
    const members = await project.members().fetch();
    expect(members.length).to.equal(0);
  });
});

describe("processStripeToken", () => {
  let creator, contributor, project, projectMutations, options;

  before(async () => {
    options = null;
    const mockStripe = () => ({
      charges: {
        create: (ops) => {
          options = ops;
        },
      },
    });

    mockRequire("stripe", mockStripe);
    projectMutations = mockRequire.reRequire("./project");

    contributor = await factories.user().save();
    const stripeAccount = await factories.stripeAccount().save();
    creator = await factories
      .user({ stripe_account_id: stripeAccount.id })
      .save();
    project = await factories.post({ user_id: creator.id }).save();
  });

  after(() => mockRequire.stopAll());

  it("works", async () => {
    const applicationFeeFraction = 0.01;
    const token = "fkljdfk";
    const amount = 123;
    await projectMutations.processStripeToken(
      contributor.id,
      project.id,
      token,
      amount
    );
    expect(options).to.deep.equal({
      amount: amount * 100,
      currency: "usd",
      source: token,
      application_fee: amount * 100 * applicationFeeFraction,
      description: `${contributor.get(
        "name"
      )} contributing to project ${project.get("name")} - project id: ${
        project.id
      }`,
    });
  });
});
