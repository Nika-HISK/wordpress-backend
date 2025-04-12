# 🚀 WordPress Hosting Platform Backend

This project is the backend service for a scalable WordPress hosting platform. It leverages **NestJS**, **TypeORM**, **Swagger**, **Kubernetes**, **Docker**, and also integrates **Husky** and **ESLint** for code quality and pre-commit hooks. It dynamically provisions and manages isolated WordPress instances for each user using **WP-CLI**. Media uploads and user backups are stored securely on **AWS S3**.

---

## 🧰 Tech Stack

- **NestJS** – Modular and scalable Node.js framework
- **TypeORM** – ORM for PostgreSQL (or your chosen DB)
- **Swagger** – Auto-generated API documentation
- **Kubernetes** – Each user gets their own namespace for isolation
- **WP-CLI** – Command-line tool to control WordPress instances
- **AWS S3** – Used to store user media (images) and backups
- **Docker** – For containerizing and simplifying deployment
- **Husky** – Git hooks for pre-commit and other workflows
- **ESLint** – JavaScript/TypeScript linting for consistent code style

---

## 📦 Features

- Multi-tenant architecture: One namespace per user
- Automated WordPress deployments per namespace
- Full WordPress lifecycle management (install, update, delete) via WP-CLI
- RESTful API with Swagger documentation
- Media and backups stored on S3
- Secure, scalable, and containerized using Docker
- Code quality enforced with **ESLint** and **Husky** (pre-commit hooks)

---

## 🛠️ Development

```bash
# Clone the repo
git clone https://github.com/Nika-HISK/wordpress-backend.git
cd wordpress-backend

# Install dependencies
npm install

# Run the app
npm run start:dev
