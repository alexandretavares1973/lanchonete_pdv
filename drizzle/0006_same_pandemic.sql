ALTER TABLE `orders` ADD `legacyKey` varchar(191);--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_legacyKey_unique` UNIQUE(`legacyKey`);