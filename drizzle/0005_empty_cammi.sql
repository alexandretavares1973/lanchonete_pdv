
CREATE TABLE `refund_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`userId` int,
	`username` varchar(255) NOT NULL,
	`loginMethod` varchar(64) NOT NULL,
	`reason` varchar(255) NOT NULL,
	`orderTotal` decimal(10,2) NOT NULL,
	`itemsSnapshot` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `refund_audits_id` PRIMARY KEY(`id`)
);
