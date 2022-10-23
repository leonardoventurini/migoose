## Migoose

After working many years with `mongoose`, I faced a problem, I needed to run migrations in an app which was bundled
with `@vercel/ncc` for running in a Docker container in Kubernetes.

Problem was, all solutions I could find involved globbying a _migrations_ directory for files at runtime.

I needed something which generated code referenced by my codebase through imports to be included in that bundle.

Hence it is born `migoose`, it implements a command-line utility which will generate the migration files for you, and a
utility which will run them.
