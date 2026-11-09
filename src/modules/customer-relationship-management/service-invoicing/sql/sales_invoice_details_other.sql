-- vos_database.sales_invoice_details_other definition
-- Dynamic line items table for Service Invoicing (linked to sales_invoice.invoice_id)

CREATE TABLE IF NOT EXISTS `sales_invoice_details_other` (
  `detail_id` int NOT NULL AUTO_INCREMENT,
  `invoice_id` int NOT NULL,
  `order_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `item_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `unit` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `quantity` double DEFAULT '1',
  `unit_price` double DEFAULT '0',
  `gross_amount` double DEFAULT '0',
  `discount_amount` double DEFAULT '0',
  `vat_amount` double DEFAULT '0',
  `ewt_amount` double DEFAULT '0',
  `total_amount` double DEFAULT '0',
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `created_by` int DEFAULT NULL,
  `created_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `modified_by` int DEFAULT NULL,
  `modified_date` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`detail_id`),
  KEY `IDX_sido_invoice_id` (`invoice_id`),
  KEY `IDX_sido_order_id` (`order_id`),
  KEY `FK_sido_created_by` (`created_by`),
  KEY `FK_sido_modified_by` (`modified_by`),
  CONSTRAINT `FK_sido_sales_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoice` (`invoice_id`) ON DELETE CASCADE,
  CONSTRAINT `FK_sido_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`user_id`),
  CONSTRAINT `FK_sido_modified_by` FOREIGN KEY (`modified_by`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

