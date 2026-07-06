ALTER TABLE `category` ADD `code` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `category` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `category`
SET
	`code` = CASE lower(trim(`name`))
		WHEN 'food' THEN 'food'
		WHEN 'transport' THEN 'transport'
		WHEN 'groceries' THEN 'groceries'
		WHEN 'housing' THEN 'housing'
		WHEN 'utilities' THEN 'utilities'
		WHEN 'subs' THEN 'subs'
		WHEN 'personal' THEN 'personal'
		WHEN 'travel' THEN 'travel'
		WHEN 'misc' THEN 'misc'
		ELSE lower(
			replace(
				replace(
					replace(
						replace(
							replace(trim(`name`), '&', ' and '),
							'/',
							' '
						),
						'-',
						' '
					),
					'  ',
					' '
				),
				' ',
				'_'
			)
		)
	END,
	`sort_order` = CASE lower(trim(`name`))
		WHEN 'food' THEN 10
		WHEN 'transport' THEN 20
		WHEN 'groceries' THEN 30
		WHEN 'housing' THEN 40
		WHEN 'utilities' THEN 50
		WHEN 'subs' THEN 60
		WHEN 'personal' THEN 70
		WHEN 'travel' THEN 80
		WHEN 'misc' THEN 90
		ELSE 999
	END
WHERE `deleted_at` IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `category_code_unique` ON `category` (`code`) WHERE deleted_at IS NULL;--> statement-breakpoint
ALTER TABLE `sub_category` ADD `code` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `sub_category` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `sub_category`
SET
	`code` = CASE lower(trim(`name`))
		WHEN 'restaurants & dining' THEN 'restaurants_dining'
		WHEN 'coffee & tea' THEN 'coffee_tea'
		WHEN 'delivery & takeout' THEN 'delivery_takeout'
		WHEN 'public transit' THEN 'public_transit'
		WHEN 'ride share & taxis' THEN 'ride_share_taxis'
		WHEN 'fuel' THEN 'fuel'
		WHEN 'parking & tolls' THEN 'parking_tolls'
		WHEN 'vehicle maintenance' THEN 'vehicle_maintenance'
		WHEN 'supermarket' THEN 'supermarket'
		WHEN 'fruits & vegetables' THEN 'fruits_vegetables'
		WHEN 'local market / kirana' THEN 'local_market_kirana'
		WHEN 'rent' THEN 'rent'
		WHEN 'home supplies' THEN 'home_supplies'
		WHEN 'home maintenance' THEN 'home_maintenance'
		WHEN 'electricity' THEN 'electricity'
		WHEN 'water' THEN 'water'
		WHEN 'internet' THEN 'internet'
		WHEN 'mobile' THEN 'mobile'
		WHEN 'insurance' THEN 'insurance'
		WHEN 'streaming' THEN 'streaming'
		WHEN 'software & apps' THEN 'software_apps'
		WHEN 'memberships' THEN 'memberships'
		WHEN 'health & medical' THEN 'health_medical'
		WHEN 'fitness' THEN 'fitness'
		WHEN 'salon & grooming' THEN 'salon_grooming'
		WHEN 'shopping' THEN 'shopping'
		WHEN 'hobbies' THEN 'hobbies'
		WHEN 'flights & trains' THEN 'flights_trains'
		WHEN 'hotels & stays' THEN 'hotels_stays'
		WHEN 'activities' THEN 'activities'
		WHEN 'gifts & donations' THEN 'gifts_donations'
		WHEN 'education' THEN 'education'
		WHEN 'cash withdrawal' THEN 'cash_withdrawal'
		WHEN 'fees & charges' THEN 'fees_charges'
		WHEN 'other' THEN 'other'
		ELSE lower(
			replace(
				replace(
					replace(
						replace(
							replace(
								replace(trim(`name`), '&', ' and '),
								'/',
								' '
							),
							'-',
							' '
						),
						'''',
						''
					),
					'  ',
					' '
				),
				' ',
				'_'
			)
		)
	END,
	`sort_order` = CASE lower(trim(`name`))
		WHEN 'restaurants & dining' THEN 10
		WHEN 'coffee & tea' THEN 20
		WHEN 'delivery & takeout' THEN 30
		WHEN 'public transit' THEN 10
		WHEN 'ride share & taxis' THEN 20
		WHEN 'fuel' THEN 30
		WHEN 'parking & tolls' THEN 40
		WHEN 'vehicle maintenance' THEN 50
		WHEN 'supermarket' THEN 10
		WHEN 'fruits & vegetables' THEN 20
		WHEN 'local market / kirana' THEN 30
		WHEN 'rent' THEN 10
		WHEN 'home supplies' THEN 20
		WHEN 'home maintenance' THEN 30
		WHEN 'electricity' THEN 10
		WHEN 'water' THEN 20
		WHEN 'internet' THEN 30
		WHEN 'mobile' THEN 40
		WHEN 'insurance' THEN 50
		WHEN 'streaming' THEN 10
		WHEN 'software & apps' THEN 20
		WHEN 'memberships' THEN 30
		WHEN 'health & medical' THEN 10
		WHEN 'fitness' THEN 20
		WHEN 'salon & grooming' THEN 30
		WHEN 'shopping' THEN 40
		WHEN 'hobbies' THEN 50
		WHEN 'flights & trains' THEN 10
		WHEN 'hotels & stays' THEN 20
		WHEN 'activities' THEN 30
		WHEN 'gifts & donations' THEN 10
		WHEN 'education' THEN 20
		WHEN 'cash withdrawal' THEN 30
		WHEN 'fees & charges' THEN 40
		WHEN 'other' THEN 50
		ELSE 999
	END
WHERE `deleted_at` IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `sub_category_category_user_code_unique` ON `sub_category` (`category_id`,`user_id`,`code`) WHERE deleted_at IS NULL;
