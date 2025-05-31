# Mythoria Database Schema

This document describes the complete database schema for the Mythoria project, a platform for creating personalized stories and managing their publication and distribution.

## Overview

The Mythoria database is built using **PostgreSQL** with **Drizzle ORM** for type-safe database operations. The schema is organized into several domains, each responsible for specific business logic areas.

## Schema Domains

### 1. Authors Domain

The Authors domain manages user accounts, authentication, and related data.

#### Tables

##### `authors`
Main user/author table containing account information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `author_id` | UUID | PRIMARY KEY, DEFAULT random | Unique identifier for the author |
| `clerk_user_id` | VARCHAR(255) | NOT NULL, UNIQUE | Clerk authentication service user ID |
| `display_name` | VARCHAR(120) | NOT NULL | Author's display name |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Author's email address |
| `fiscal_number` | VARCHAR(40) | NULLABLE | Tax/fiscal identification number |
| `mobile_phone` | VARCHAR(30) | NULLABLE | Mobile phone number |
| `last_login_at` | TIMESTAMP WITH TIMEZONE | NULLABLE | Last login timestamp |
| `preferred_locale` | VARCHAR(5) | DEFAULT 'en' | Preferred language/locale (e.g., 'en', 'pt-PT') |
| `created_at` | TIMESTAMP WITH TIMEZONE | NOT NULL, DEFAULT NOW() | Account creation timestamp |

##### `leads`
Email collection for app launch notifications.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `lead_id` | UUID | PRIMARY KEY, DEFAULT random | Unique identifier for the lead |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Email address for notifications |
| `created_at` | TIMESTAMP WITH TIMEZONE | NOT NULL, DEFAULT NOW() | Lead creation timestamp |
| `notified_at` | TIMESTAMP WITH TIMEZONE | NULLABLE | When the lead was notified |

##### `addresses`
User addresses for billing and delivery.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `address_id` | UUID | PRIMARY KEY, DEFAULT random | Unique identifier for the address |
| `author_id` | UUID | NOT NULL, FK → authors.author_id CASCADE | Owner of the address |
| `type` | address_type ENUM | NOT NULL | Address type: 'billing' or 'delivery' |
| `line1` | VARCHAR(255) | NOT NULL | First address line |
| `line2` | VARCHAR(255) | NULLABLE | Second address line |
| `city` | VARCHAR(120) | NOT NULL | City name |
| `state_region` | VARCHAR(120) | NULLABLE | State or region |
| `postal_code` | VARCHAR(20) | NULLABLE | Postal/ZIP code |
| `country` | VARCHAR(2) | NOT NULL | ISO country code (2 characters) |
| `phone` | VARCHAR(30) | NULLABLE | Phone number for this address |
| `created_at` | TIMESTAMP WITH TIMEZONE | NOT NULL, DEFAULT NOW() | Address creation timestamp |

##### `events`
System events and audit trail.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `event_id` | UUID | PRIMARY KEY, DEFAULT random | Unique identifier for the event |
| `author_id` | UUID | NULLABLE, FK → authors.author_id SET NULL | Author who performed the action |
| `event_type` | VARCHAR(100) | NOT NULL | Event type (e.g., 'story.created', 'user.login') |
| `payload` | JSONB | NULLABLE | Event-specific data in JSON format |
| `created_at` | TIMESTAMP WITH TIMEZONE | NOT NULL, DEFAULT NOW() | Event timestamp |

### 2. Stories Domain

The Stories domain manages story creation, versioning, and metadata.

#### Tables

##### `stories`
Main stories table with content and metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `story_id` | UUID | PRIMARY KEY, DEFAULT random | Unique identifier for the story |
| `author_id` | UUID | NOT NULL, FK → authors.author_id CASCADE | Story author |
| `title` | VARCHAR(255) | NOT NULL | Story title |
| `plot_description` | TEXT | NULLABLE | Plot description |
| `synopsis` | TEXT | NULLABLE | Story synopsis |
| `place` | TEXT | NULLABLE | Story setting (real or imaginary) |
| `additional_requests` | TEXT | NULLABLE | Special requests for products, companies, details |
| `target_audience` | VARCHAR(120) | NULLABLE | Target audience description |
| `novel_style` | VARCHAR(120) | NULLABLE | Novel style (e.g., "kids book", "adventure") |
| `graphical_style` | VARCHAR(120) | NULLABLE | Desired graphical style |
| `status` | story_status ENUM | DEFAULT 'draft' | Status: 'draft', 'writing', 'published' |
| `features` | JSONB | NULLABLE | Available features: `{"ebook":true,"printed":false,"audiobook":true}` |
| `delivery_address` | JSONB | NULLABLE | Delivery address for printed books |
| `dedication_message` | TEXT | NULLABLE | Personalized dedication message |
| `media_links` | JSONB | NULLABLE | Media links: `{"cover":"...","pdf":"...","audio":"..."}` |
| `created_at` | TIMESTAMP WITH TIMEZONE | NOT NULL, DEFAULT NOW() | Story creation timestamp |
| `updated_at` | TIMESTAMP WITH TIMEZONE | NOT NULL, DEFAULT NOW() | Last update timestamp |

##### `story_versions`
Version history for stories.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `story_version_id` | UUID | PRIMARY KEY, DEFAULT random | Unique identifier for the version |
| `story_id` | UUID | NOT NULL, FK → stories.story_id CASCADE | Parent story |
| `version_number` | INTEGER | NOT NULL | Version number |
| `text_jsonb` | JSONB | NOT NULL | Story content snapshot in JSON format |
| `created_at` | TIMESTAMP WITH TIMEZONE | NOT NULL, DEFAULT NOW() | Version creation timestamp |

### 3. Characters Domain

The Characters domain manages story characters and their relationships.

#### Tables

##### `characters`
Character definitions and attributes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `character_id` | UUID | PRIMARY KEY, DEFAULT random | Unique identifier for the character |
| `author_id` | UUID | NULLABLE, FK → authors.author_id CASCADE | Character creator (null for generic characters) |
| `name` | VARCHAR(120) | NOT NULL | Character name |
| `type` | VARCHAR(60) | NULLABLE | Character type (e.g., "boy", "girl", "dog", "alien") |
| `passions` | TEXT | NULLABLE | Character's interests and passions |
| `superpowers` | TEXT | NULLABLE | Character's superpowers or special abilities |
| `physical_description` | TEXT | NULLABLE | Physical description of the character |
| `photo_url` | TEXT | NULLABLE | URL to character's photo/image |
| `created_at` | TIMESTAMP WITH TIMEZONE | NOT NULL, DEFAULT NOW() | Character creation timestamp |

##### `story_characters`
Many-to-many relationship between stories and characters.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `story_id` | UUID | NOT NULL, FK → stories.story_id CASCADE | Story reference |
| `character_id` | UUID | NOT NULL, FK → characters.character_id CASCADE | Character reference |
| `role` | VARCHAR(120) | NULLABLE | Character's role in the story |

**Primary Key**: Composite of (`story_id`, `character_id`)

### 4. Payments Domain

The Payments domain handles payment methods, transactions, and credits.

#### Tables

##### `payment_methods`
Stored payment method information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `payment_method_id` | UUID | PRIMARY KEY, DEFAULT random | Unique identifier for the payment method |
| `author_id` | UUID | NOT NULL, FK → authors.author_id CASCADE | Payment method owner |
| `provider` | payment_provider ENUM | NOT NULL | Provider: 'stripe', 'paypal', 'revolut', 'other' |
| `provider_ref` | VARCHAR(255) | NOT NULL | Provider-specific reference (e.g., Stripe PM ID) |
| `brand` | VARCHAR(60) | NULLABLE | Card brand ("Visa", "Mastercard", etc.) |
| `last4` | VARCHAR(4) | NULLABLE | Last 4 digits of card number |
| `exp_month` | INTEGER | NULLABLE | Card expiration month |
| `exp_year` | INTEGER | NULLABLE | Card expiration year |
| `billing_details` | JSONB | NULLABLE | Billing details in JSON format |
| `is_default` | BOOLEAN | DEFAULT false | Whether this is the default payment method |
| `created_at` | TIMESTAMP WITH TIMEZONE | NOT NULL, DEFAULT NOW() | Payment method creation timestamp |

##### `credits`
User credit balances.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `credit_id` | UUID | PRIMARY KEY, DEFAULT random | Unique identifier for the credit record |
| `author_id` | UUID | NOT NULL, FK → authors.author_id CASCADE | Credit owner |
| `balance` | INTEGER | NOT NULL, DEFAULT 0 | Credit balance (in smallest currency unit) |
| `last_updated_at` | TIMESTAMP WITH TIMEZONE | NOT NULL, DEFAULT NOW() | Last balance update timestamp |

##### `payments`
Payment transaction records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `payment_id` | UUID | PRIMARY KEY, DEFAULT random | Unique identifier for the payment |
| `author_id` | UUID | NOT NULL, FK → authors.author_id CASCADE | Payment payer |
| `payment_method_id` | UUID | NULLABLE, FK → payment_methods.payment_method_id | Payment method used |
| `shipping_code_id` | UUID | NULLABLE, FK → shipping_codes.shipping_code_id | Associated shipping |
| `amount` | INTEGER | NOT NULL | Payment amount (in smallest currency unit) |
| `currency` | VARCHAR(3) | NOT NULL, DEFAULT 'usd' | ISO currency code |
| `status` | VARCHAR(50) | NOT NULL | Payment status ('pending', 'succeeded', 'failed') |
| `provider_payment_id` | VARCHAR(255) | NULLABLE | Provider-specific payment ID |
| `created_at` | TIMESTAMP WITH TIMEZONE | NOT NULL, DEFAULT NOW() | Payment creation timestamp |
| `updated_at` | TIMESTAMP WITH TIMEZONE | NOT NULL, DEFAULT NOW() | Payment update timestamp |

### 5. Shipping Domain

The Shipping domain manages delivery of printed materials.

#### Tables

##### `shipping_codes`
Shipping and tracking information for printed orders.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `shipping_code_id` | UUID | PRIMARY KEY, DEFAULT random | Unique identifier for the shipping record |
| `story_id` | UUID | NOT NULL, FK → stories.story_id CASCADE | Story being shipped |
| `address_id` | UUID | NOT NULL, FK → addresses.address_id CASCADE | Delivery address |
| `carrier` | VARCHAR(120) | NULLABLE | Shipping carrier name |
| `tracking_code` | VARCHAR(120) | NOT NULL | Carrier tracking code |
| `shipped_at` | TIMESTAMP WITH TIMEZONE | NULLABLE | Shipment timestamp |
| `delivered_at` | TIMESTAMP WITH TIMEZONE | NULLABLE | Delivery timestamp |

## Enumerations

### `story_status`
- `draft`: Story is being drafted
- `writing`: Story is in the writing phase
- `published`: Story has been published

### `address_type`
- `billing`: Billing address
- `delivery`: Delivery address

### `payment_provider`
- `stripe`: Stripe payment processing
- `paypal`: PayPal payment processing
- `revolut`: Revolut payment processing
- `other`: Other payment providers

## Relationships

### Key Relationships

1. **Authors → Stories**: One-to-Many
   - An author can create multiple stories
   - Each story belongs to one author

2. **Stories → Characters**: Many-to-Many (via `story_characters`)
   - A story can have multiple characters
   - A character can appear in multiple stories

3. **Authors → Addresses**: One-to-Many
   - An author can have multiple addresses
   - Each address belongs to one author

4. **Authors → Payment Methods**: One-to-Many
   - An author can have multiple payment methods
   - Each payment method belongs to one author

5. **Stories → Story Versions**: One-to-Many
   - A story can have multiple versions
   - Each version belongs to one story

6. **Payments → Shipping Codes**: One-to-One
   - A payment can be associated with one shipping record
   - A shipping record can be associated with one payment

## Data Types and Formats

### JSON Fields

Several tables use JSONB fields for flexible data storage:

- `stories.features`: `{"ebook":true,"printed":false,"audiobook":true}`
- `stories.delivery_address`: Complete address information
- `stories.media_links`: `{"cover":"url","pdf":"url","audio":"url"}`
- `payment_methods.billing_details`: Billing information
- `events.payload`: Event-specific data
- `story_versions.text_jsonb`: Complete story content

### UUID Fields

All primary keys use UUID v4 with PostgreSQL's `gen_random_uuid()` function for better distribution and security.

### Timestamps

All timestamp fields use `TIMESTAMP WITH TIMEZONE` to ensure proper timezone handling across different geographical locations.

## Authentication Integration

The schema integrates with **Clerk** authentication service:
- `authors.clerk_user_id` stores the Clerk user identifier
- This allows seamless integration between the application's user management and the database

## Notes

- The database supports multiple languages through the `preferred_locale` field
- Event logging provides an audit trail for system activities
- The schema supports both digital and physical product delivery
- Credit system allows for prepaid services or rewards
- Flexible character system supports both author-created and system-provided characters
