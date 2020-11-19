const md5 = require("md5");
const Nexudus = require("../services/Nexudus");

const generateToken = function (token, key, date, hash) {
  const secret = process.env.NEXUDUS_SECRET_KEY;
  const checkString = [token, key, date].sort().join("|") + secret;
  const checkHash = md5(checkString);
  if (hash !== checkHash) {
    throw new Error(format("bad hash: expected %s, got %s", hash, checkHash));
  }
  return md5(token + secret);
};

module.exports = {
  generateToken: generateToken,
  create: function (req, res) {
    const params = req.allParams();
    const email = params.e;
    const token = generateToken(params.t, params.a, params.d, params.h);

    Nexudus.fetchUsers(params.a, token)
      .tap((results) =>
        Email.sendRawEmail(
          "robbie@hylo.com",
          {
            subject: format(
              "Nexudus user records (%s) for %s",
              results.length,
              email
            ),
          },
          {
            files: [
              {
                id: "users.json",
                data: new Buffer(JSON.stringify(results, null, "  ")).toString(
                  "base64"
                ),
              },
            ],
          }
        )
      )
      .tap((results) =>
        res.ok(format("Sent %s records to Hylo.", results.length))
      )
      .catch(res.serverError);
  },
};
