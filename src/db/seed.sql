-- Standard Categories
INSERT INTO category (id, user_id, name, color) VALUES 
('cat-food', NULL, 'food', 'bg-pink'),
('cat-transport', NULL, 'transport', 'bg-yellow'),
('cat-groceries', NULL, 'groceries', 'bg-teal'),
('cat-housing', NULL, 'housing', 'bg-ink'),
('cat-utilities', NULL, 'utilities', 'bg-teal'),
('cat-subs', NULL, 'subs', 'bg-pink'),
('cat-personal', NULL, 'personal', 'bg-pink'),
('cat-travel', NULL, 'travel', 'bg-yellow'),
('cat-misc', NULL, 'misc', 'bg-teal')
ON CONFLICT(id) DO NOTHING;

-- Standard Subcategories
INSERT INTO sub_category (id, category_id, user_id, name) VALUES
-- Food
('sub-dining-out', 'cat-food', NULL, 'dining out'),
('sub-coffee-cafes', 'cat-food', NULL, 'coffee & cafes'),
('sub-delivery', 'cat-food', NULL, 'fast food / delivery'),
-- Transport
('sub-public-transit', 'cat-transport', NULL, 'public transit'),
('sub-rideshare-cabs', 'cat-transport', NULL, 'rideshare & cabs'),
('sub-fuel-gas', 'cat-transport', NULL, 'fuel & gas'),
('sub-parking-tolls', 'cat-transport', NULL, 'parking & tolls'),
('sub-vehicle-maintenance', 'cat-transport', NULL, 'vehicle maintenance'),
-- Groceries
('sub-supermarket', 'cat-groceries', NULL, 'supermarket'),
('sub-vegetables', 'cat-groceries', NULL, 'vegetables'),
('sub-kirana', 'cat-groceries', NULL, 'kirana'),
-- Housing
('sub-rent-mortgage', 'cat-housing', NULL, 'rent / mortgage'),
('sub-household-goods', 'cat-housing', NULL, 'household goods & maintenance'),
-- Utilities
('sub-electricity-gas', 'cat-utilities', NULL, 'electricity & gas'),
('sub-water-trash', 'cat-utilities', NULL, 'water & trash'),
('sub-internet-wifi', 'cat-utilities', NULL, 'internet & wifi'),
('sub-mobile-phone', 'cat-utilities', NULL, 'mobile & cell phone'),
('sub-insurance', 'cat-utilities', NULL, 'insurance'),
-- Subs
('sub-streaming', 'cat-subs', NULL, 'streaming services'),
('sub-software-cloud', 'cat-subs', NULL, 'software & cloud subscriptions'),
-- Personal
('sub-gym-fitness', 'cat-personal', NULL, 'gym & fitness'),
('sub-salon-barber', 'cat-personal', NULL, 'salon & barbershop'),
('sub-medical-healthcare', 'cat-personal', NULL, 'medical & healthcare'),
('sub-shopping-clothing', 'cat-personal', NULL, 'shopping & clothing'),
('sub-hobbies-sports', 'cat-personal', NULL, 'hobbies & sports'),
-- Travel
('sub-flights-trains', 'cat-travel', NULL, 'flights & trains'),
('sub-lodging-hotels', 'cat-travel', NULL, 'lodging & hotels'),
('sub-sightseeing', 'cat-travel', NULL, 'activities & sightseeing'),
-- Misc
('sub-gifts-donations', 'cat-misc', NULL, 'gifts & donations'),
('sub-education-books', 'cat-misc', NULL, 'education & books'),
('sub-cash-atm', 'cat-misc', NULL, 'cash / ATM'),
('sub-other', 'cat-misc', NULL, 'other / uncategorized')
ON CONFLICT(id) DO NOTHING;
