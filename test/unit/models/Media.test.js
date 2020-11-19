const root = require("root-path");
require(root("test/setup"));
const factories = require(root("test/setup/factories"));

describe("Media", () => {
  describe(".createForSubject", () => {
    let post;
    beforeEach(() => {
      post = factories.post();
      return post.save();
    });

    it("works as expected", function () {
      this.timeout(5000);
      return Media.createForSubject({
        subjectType: "post",
        subjectId: post.id,
        type: "video",
        url: "https://vimeo.com/70509133",
        position: 7,
      })
        .tap((video) => video.load("post"))
        .then((video) => {
          expect(video.id).to.exist;
          expect(video.get("width")).to.equal(640);
          expect(video.get("height")).to.equal(360);
          expect(video.get("position")).to.equal(7);
          expect(video.relations.post).to.exist;
          expect(video.relations.post.id).to.equal(post.id);
        });
    });
  });
});
