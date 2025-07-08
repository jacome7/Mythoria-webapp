CREATE TABLE "credit_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credits" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"popular" boolean DEFAULT false NOT NULL,
	"best_value" boolean DEFAULT false NOT NULL,
	"icon" varchar(50) DEFAULT 'FaShoppingCart' NOT NULL,
	"key" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_packages_key_unique" UNIQUE("key")
);
