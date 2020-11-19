import { readdirSync } from "fs";
import { basename, extname } from "path";
import Bookshelf from "bookshelf";
import Knex from "knex";
import knexfile from "../../knexfile";
import Promise from "bluebird";

export const init = () => {
  // this could be removed, if desired, if all uses of bluebird's API were
  // removed from the models
  global.Promise = Promise;

  global.bookshelf = Bookshelf(Knex(knexfile[process.env.NODE_ENV]));
  global.bookshelf.plugin("bookshelf-returning");

  return readdirSync(__dirname)
    .map((filename) => {
      if (extname(filename) !== ".js") return;
      const name = basename(filename, ".js");
      if (!name.match(/^[A-Z]/)) return;
      const model = require("./" + name);
      global[name] = model;
      return [name, model];
    })
    .filter((x) => !!x)
    .reduce((props, [name, model]) => {
      props[name] = model;
      return props;
    }, {});
};

export default { init };
