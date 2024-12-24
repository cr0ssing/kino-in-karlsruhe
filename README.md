# Kino in Karlsruhe

This project aims to provide an overview of the programs of the cinemas in Karlsruhe. It fetches the programs of all cinemas and displays them in simple web app.
Further information about the movies is provided by TMDB.

## How to contribute?

Contributions are welcome! Please refer to [CONTRIBUTING.md](./CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for more information.

To get started, make sure NodeJS (Version 20 or higher) and a package manager are installed on your machine. This project uses [pnpm](https://pnpm.io/) as its package manager. After that, clone the repository and run `pnpm install`.

## How do I deploy this?

This project can be deployed as a standard Next.js application while utilizing a PostgreSQL database.

Deployment via Docker (Compose) is actively maintained. See [docker-compose.yaml](./docker-compose.yaml) to get started. After the app and the database
are deployed the database needs to be initialized. Run `pnpm db:push` and `pnpm db:seed` for that.

## How does it work?

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

- [Next.js](https://nextjs.org)
- [Prisma](https://prisma.io)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## License

This project is licensed under the [GNU Affero General Public License v3.0](./COPYING).
