# 🚀 WordPress Hosting Platform Backend

This project is the backend service for a scalable WordPress hosting platform. It leverages **NestJS**, **TypeORM**, **Swagger**, and **Kubernetes** to dynamically provision and manage isolated WordPress instances for each user using **WP-CLI**.

---

## 🧰 Tech Stack

- **NestJS** – Modular and scalable Node.js framework
- **TypeORM** – ORM for PostgreSQL (or your chosen DB)
- **Swagger** – Auto-generated API documentation
- **Kubernetes** – Each user gets their own namespace for isolation
- **WP-CLI** – Command-line tool to control WordPress instances

---

## 📦 Features

- Multi-tenant architecture: One namespace per user
- Automated WordPress deployments per namespace
- Full WordPress lifecycle management (install, update, delete) via WP-CLI
- RESTful API with Swagger documentation
- Secure, scalable, and containerized

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
