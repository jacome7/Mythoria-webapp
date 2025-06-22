-- Insert sample print providers
INSERT INTO print_providers (
  name,
  company_name,
  vat_number,
  email_address,
  phone_number,
  address,
  postal_code,
  city,
  country,
  prices,
  integration,
  available_countries,
  is_active
) VALUES (
  'BookPrintPro',
  'BookPrint Professional Ltd.',
  'GB123456789',
  'orders@bookprintpro.com',
  '+44 20 1234 5678',
  '123 Publishing Street',
  'SW1A 1AA',
  'London',
  'GB',
  '{
    "paperback": {
      "basePrice": 8.99,
      "perPagePrice": 0.05,
      "minPages": 50,
      "maxPages": 500
    },
    "hardcover": {
      "basePrice": 15.99,
      "perPagePrice": 0.08,
      "minPages": 50,
      "maxPages": 400
    },
    "shipping": {
      "standard": 4.99,
      "express": 12.99,
      "free_threshold": 25.00
    }
  }',
  'email',
  '["GB", "IE", "FR", "DE", "ES", "IT", "NL", "BE"]',
  true
), (
  'PrintOnDemand USA',
  'American Print Solutions Inc.',
  'US987654321',
  'service@printondemandusa.com',
  '+1 555 123 4567',
  '456 Business Ave',
  '10001',
  'New York',
  'US',
  '{
    "paperback": {
      "basePrice": 12.99,
      "perPagePrice": 0.06,
      "minPages": 40,
      "maxPages": 600
    },
    "hardcover": {
      "basePrice": 19.99,
      "perPagePrice": 0.09,
      "minPages": 40,
      "maxPages": 450
    },
    "shipping": {
      "standard": 6.99,
      "express": 15.99,
      "free_threshold": 35.00
    }
  }',
  'api',
  '["US", "CA", "MX"]',
  true
);
