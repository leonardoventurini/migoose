![tests](https://github.com/leonardoventurini/migoose/actions/workflows/tests.yml/badge.svg)

## Migoose

After working many years with `mongoose`, I faced a problem, I needed to run migrations in an app which was bundled
with `@vercel/ncc` for running in a Docker container in Kubernetes.

Problem was, all solutions I could find involved globbying a _migrations_ directory for files at runtime.

I needed something which generated code referenced by my codebase through imports to be included in that bundle.

Hence, it is born `migoose`, it implements a command-line utility which will generate the migration files for you, and a
utility which will run them.

## Installing

You can run `npm install migoose` or `yarn add migoose` in the command line.


> Note that you will run it in production, so it must not be a dev dependency.

## Usage

```shell
yarn migoose create
```

This will prompt for a migration description, and then it will generate the file for you. Once it has been generated you
can just edit it with whatever your heart desires.

## Configuration

You can configure `migoose` by creating a `.migooserc` file in the root of your project.

```json
{
  "dir": "migrations",
  "typescript": false,
  "es6": false
}
```

You don't need to specify a database connection since it will use `mongoose`'s connection.

## Running Migrations

Please note that for simplicity there is no "down" migration, so if you need to revert a migration you will need add
another one undoing stuff.

```js
import mongoose from 'mongoose';
import { Migoose } from 'migoose';

await import('./migrations')
await Migoose.migrate(mongoose) // It needs your Mongoose instance.
```
