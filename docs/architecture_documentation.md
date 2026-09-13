# EIPMS Software Architecture Documentation

This document explains the software patterns, design philosophies, and architectural implementations governing the **Enterprise Inventory & Procurement Management System (EIPMS)**.

---

## 🏗️ Clean & Feature-Based Architecture

EIPMS is built on **Clean Architecture** principles. The codebase cleanly separates concerns between raw database storage layers, business logic engines, API routers, and visual client frames.

Within the backend, features are organized modularly:
1. **Model Layer (Prisma Database Package):** Defines schemas and direct database exports.
2. **Repository Layer:** Encapsulates raw data access query patterns.
3. **Service Layer:** Orchestrates business transactions, validations, security constraints, and database transactional audits.
4. **Controller/Router Layer:** Parses input HTTP requests, enforces Zod validators, routes to business services, and returns formatted JSON HTTP responses.

```
       +--------------------------------------------+
       |             Electron Wrapper               |
       |  Desktop Frame, Preload Scripts, Native IPC|
       +--------------------+-----------------------+
                            | (HTTP over LAN)
                            v
       +--------------------------------------------+
       |             Vite + React UI                |
       |  Redux Store, TanStack Queries, Pages, CSS |
       +--------------------+-----------------------+
                            |
                            v
       +--------------------------------------------+
       |             Express Backend                |
       |  Router -> Middleware -> Controller Layer  |
       +--------------------+-----------------------+
                            |
                            v
       +--------------------------------------------+
       |              Service Layer                 |
       |   Business Transactions & Audits Logic     |
       +--------------------+-----------------------+
                            |
                            v
       +--------------------------------------------+
       |            Repository Layer                |
       |        Encapsulated Prisma queries         |
       +--------------------+-----------------------+
                            |
                            v
       +--------------------------------------------+
       |            Microsoft SQL Server            |
       |          Database Engine Instance          |
       +--------------------------------------------+
```

---

## 🛠️ Design Principles & Patterns

### 1. SOLID Principles
- **Single Responsibility (SRP):** Classes and layers have one distinct job. For example, `UserRepository` focuses on query mapping, `AuthService` handles hashes/verification/sessions, and `auth.ts` routes requests.
- **Open/Closed (OCP):** System architectures are extendable without modification. Adding a new module (e.g. `Sales`) requires registering a new service/repository without changing existing `purchases` codes.
- **Liskov Substitution (LSP):** Safe sub-type replacements. Validated through strict TypeScript interfaces.
- **Interface Segregation (ISP):** Client interfaces are segregated. Database models are divided into separate tables instead of large sparse tables.
- **Dependency Inversion (DIP):** Modules depend on abstractions. Backend services leverage modular repositories exported as decoupled constants, isolating core APIs from database engines.

### 2. Repository Pattern
To maintain database decoupling, controllers do not query Prisma directly. Instead, queries are isolated inside dedicated classes:
- [UserRepository](file:///d:/City%20links/apps/backend/src/repositories/user.repository.ts)
- [ProductRepository](file:///d:/City%20links/apps/backend/src/repositories/product.repository.ts)
- [PurchaseRepository](file:///d:/City%20links/apps/backend/src/repositories/purchase.repository.ts)

### 3. Service Pattern (Business Layer)
Complex transactions, multi-record creations, and stock adjustment flows are orchestrated as isolated methods:
- [AuthService](file:///d:/City%20links/apps/backend/src/services/auth.service.ts)
- [ProductService](file:///d:/City%20links/apps/backend/src/services/product.service.ts)
- [PurchaseService](file:///d:/City%20links/apps/backend/src/services/purchase.service.ts)

### 4. DTO & Validation Pattern
Inputs are sanitized in two stages:
- **Zod Schemas ([packages/shared](file:///d:/City%20links/packages/shared/src/index.ts)):** Defines validation contracts shared between client and server.
- **Express Validators:** Validates incoming payloads at router boundaries before entering controllers.

---

## 🔒 Security Architectures
- **Password Cryptography:** Secure bcrypt 10-round salted password hashing.
- **JWT Middleware:** Role-Based Access Control (RBAC) and Permission-Based Access Control (PBAC) are enforced using JWT Bearer headers.
- **Helmet Headers:** Express security headers mapped via Helmet to prevent XSS and clickjacking.
- **CORS Configuration:** Enables local LAN clients IP binding securely.
