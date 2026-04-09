-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : localhost:8889
-- Généré le : mer. 08 avr. 2026 à 21:09
-- Version du serveur : 8.0.40
-- Version de PHP : 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `kekosan_db`
--

-- --------------------------------------------------------

--
-- Structure de la table `categories`
--

CREATE TABLE `categories` (
  `id` int NOT NULL,
  `slug` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `categories`
--

INSERT INTO `categories` (`id`, `slug`, `label`, `sort_order`) VALUES
(1, 'entree', 'Entrée', 1),
(2, 'banhmi', 'Bánh mì', 2),
(3, 'dessert', 'Dessert', 3),
(4, 'boisson', 'Boisson', 4);

-- --------------------------------------------------------

--
-- Structure de la table `formulas`
--

CREATE TABLE `formulas` (
  `id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `price` decimal(6,2) NOT NULL,
  `available` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `image_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `formulas`
--

INSERT INTO `formulas` (`id`, `name`, `description`, `price`, `available`, `sort_order`, `image_url`) VALUES
(5, 'Keko speed', 'Banh mi + boisson', 11.90, 1, 0, '/uploads/formula_5_1775603172056.webp'),
(6, 'Kekosan', 'Entrée  ou dessert + Banh mi + Boisson', 13.90, 1, 0, '/uploads/formula_6_1775603193154.webp');

-- --------------------------------------------------------

--
-- Structure de la table `formula_slots`
--

CREATE TABLE `formula_slots` (
  `id` int NOT NULL,
  `formula_id` int NOT NULL,
  `slot_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `allowed_categories` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `formula_slots`
--

INSERT INTO `formula_slots` (`id`, `formula_id`, `slot_name`, `allowed_categories`) VALUES
(39, 5, 'Bánh mì', 'banhmi'),
(40, 5, 'Boisson', 'boisson'),
(41, 6, 'Entrée', 'entree,dessert'),
(42, 6, 'Bánh mì', 'banhmi'),
(43, 6, 'Boisson', 'boisson');

-- --------------------------------------------------------

--
-- Structure de la table `orders`
--

CREATE TABLE `orders` (
  `id` int NOT NULL,
  `tracking_token` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `delivery_address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `delivery_time` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','confirmed','preparing','delivering','delivered','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `subtotal` decimal(8,2) NOT NULL,
  `delivery_fee` decimal(8,2) NOT NULL DEFAULT '0.00',
  `total` decimal(8,2) NOT NULL,
  `payment_status` enum('pending','paid','failed','refunded') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `stripe_payment_intent_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `orders`
--

INSERT INTO `orders` (`id`, `tracking_token`, `customer_name`, `customer_phone`, `customer_email`, `delivery_address`, `delivery_time`, `status`, `subtotal`, `total`, `payment_status`, `stripe_payment_intent_id`, `notes`, `created_at`, `updated_at`) VALUES
(1, '31450adf-35f0-46f0-9e1b-c0a337b6c377', 'supakd', '0783052412', 'supaco.digital@gmail.com', '1b Rue de la Prairie', NULL, 'delivered', 35.00, 35.00, 'paid', 'pi_3TItLHIVAdbyXDlk0hG6Qhmd', NULL, '2026-04-05 16:16:07', '2026-04-05 16:21:18'),
(2, '25db6849-1d9a-4b9a-8ca5-f48ca9f5bc70', 'supa kd', '0783052412', 'supaco.digital@gmail.com', '5 rue de l\'orée du bois 01630', NULL, 'pending', 24.50, 24.50, 'pending', 'pi_3TItUTIVAdbyXDlk28azYBA7', NULL, '2026-04-05 16:25:37', '2026-04-05 16:25:37'),
(3, 'f586db61-c984-4dd7-9401-0c701dd1f713', 'supakd', '0783052412', 'supaco.digital@gmail.com', '1 rue de la prairie, Saint-Genis-Pouilly 01630', '01:30', 'pending', 26.00, 26.00, 'pending', 'pi_3TJLgyIVAdbyXDlk137mb5S4', NULL, '2026-04-06 22:32:24', '2026-04-06 22:32:24'),
(4, '2cd316b6-bf96-43ab-9389-8865a0521212', 'supakd', '0783052412', 'supaco.digital@gmail.com', '1 rue de la praire, Saint-Genis-Pouilly 01630', '01:30', 'delivered', 27.00, 27.00, 'paid', 'pi_3TJLoRIVAdbyXDlk1g3AL3w1', NULL, '2026-04-06 22:40:07', '2026-04-07 19:34:23'),
(5, '9b663614-c025-4472-b248-a1abafc0d1d4', 'supakd', '0783052412', 'supaco.digital@gmail.com', '1 rue de la prairie, Saint-Genis-Pouilly 01630', '23:45', 'delivered', 27.80, 27.80, 'paid', 'pi_3TJgtLIVAdbyXDlk0AUjDWkH', NULL, '2026-04-07 21:10:35', '2026-04-07 21:19:43'),
(6, 'f873ccd5-2b2e-4145-ba61-a75f2a3025d0', 'supakd', '0783052412', 'supaco.digital@gmail.com', '1 rue racine, Saint-Genis-Pouilly 01630', '23:45', 'delivered', 27.80, 27.80, 'paid', 'pi_3TJgxNIVAdbyXDlk15dvuK03', NULL, '2026-04-07 21:14:46', '2026-04-07 21:19:44'),
(7, '3b527ce1-54c5-4d14-93c1-e43d8d30f784', 'koko', '0783052412', 'supaco.digital@gmail.com', '1 rue de lfeurs, Saint-Genis-Pouilly 01630', '00:15', 'delivered', 27.80, 27.80, 'paid', 'pi_3TJh1YIVAdbyXDlk1BMLKam8', NULL, '2026-04-07 21:19:04', '2026-04-07 22:12:07'),
(8, '96cb7d22-1868-4586-91e5-8a05f3fc1551', 'supakd', '0783052412', 'supaco.digital@gmail.com', '1 rue des lob, Saint-Genis-Pouilly 01630', '00:30', 'delivered', 21.00, 21.00, 'paid', 'pi_3TJh35IVAdbyXDlk2q83D3yy', NULL, '2026-04-07 21:20:39', '2026-04-07 22:12:10'),
(9, 'f219bb97-e895-41d2-bb8e-04a19661c787', 'supaksd', '0783052412', 'supaco.digital@gmail.com', '1 rue racine, Saint-Genis-Pouilly 01630', '11:00', 'delivered', 11.90, 16.90, 'paid', 'pi_3TJiQwIVAdbyXDlk0pm3BwOE', NULL, '2026-04-07 22:49:22', '2026-04-07 22:50:30');

-- --------------------------------------------------------

--
-- Structure de la table `order_formula_items`
--

CREATE TABLE `order_formula_items` (
  `id` int NOT NULL,
  `order_id` int NOT NULL,
  `formula_id` int DEFAULT NULL,
  `formula_name_snapshot` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `formula_price_snapshot` decimal(6,2) NOT NULL,
  `quantity` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `order_formula_items`
--

INSERT INTO `order_formula_items` (`id`, `order_id`, `formula_id`, `formula_name_snapshot`, `formula_price_snapshot`, `quantity`) VALUES
(1, 1, NULL, 'Formule Complète', 17.50, 2),
(2, 2, NULL, 'Formule Midi', 13.50, 1),
(3, 5, 6, 'Big Kekosan', 13.90, 2),
(4, 6, NULL, 'Kekosan Mid', 13.90, 2),
(5, 7, 6, 'Big Kekosan', 13.90, 2),
(6, 9, 5, 'Keko speed', 11.90, 1);

-- --------------------------------------------------------

--
-- Structure de la table `order_formula_slots`
--

CREATE TABLE `order_formula_slots` (
  `id` int NOT NULL,
  `order_formula_item_id` int NOT NULL,
  `slot_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` int DEFAULT NULL,
  `product_name_snapshot` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `order_formula_slots`
--

INSERT INTO `order_formula_slots` (`id`, `order_formula_item_id`, `slot_name`, `product_id`, `product_name_snapshot`) VALUES
(1, 1, 'Entrée', 1, 'Soupe Miso'),
(2, 1, 'Bánh Mì', 5, 'Bánh Mì Poulet'),
(3, 1, 'Dessert', 7, 'Perle de Coco'),
(4, 2, 'Entrée', 2, 'Boulettes de Bœuf'),
(5, 2, 'Bánh Mì', 4, 'Bánh Mì Classique'),
(6, 3, 'Entrée', 1, 'Soupe Miso'),
(7, 3, 'Bánh mì', 4, 'Bánh Mì Classique'),
(8, 3, 'Boisson', 10, 'Café froid'),
(9, 4, 'Bánh mì', 5, 'Bánh Mì Poulet'),
(10, 4, 'Boisson', 9, 'Coca-Cola'),
(11, 4, 'Dessert', 7, 'Perle de Coco'),
(12, 5, 'Entrée', 1, 'Soupe Miso'),
(13, 5, 'Bánh mì', 4, 'Bánh Mì Classique'),
(14, 5, 'Boisson', 10, 'Café froid'),
(15, 6, 'Bánh mì', 4, 'Bánh Mì Classique'),
(16, 6, 'Boisson', 10, 'Café froid');

-- --------------------------------------------------------

--
-- Structure de la table `order_items`
--

CREATE TABLE `order_items` (
  `id` int NOT NULL,
  `order_id` int NOT NULL,
  `product_id` int DEFAULT NULL,
  `product_name_snapshot` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `unit_price_snapshot` decimal(6,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `product_name_snapshot`, `quantity`, `unit_price_snapshot`) VALUES
(1, 2, 3, 'Nems', 2, 5.50),
(2, 3, 2, 'Boulettes de Bœuf', 4, 6.50),
(3, 4, 4, 'Bánh Mì Classique', 1, 9.50),
(4, 4, 5, 'Bánh Mì Poulet', 1, 9.00),
(5, 4, 6, 'Bánh Mì Végétarien', 1, 8.50),
(6, 8, 2, 'Boulettes de Bœuf', 1, 6.50),
(7, 8, 4, 'Bánh Mì Classique', 1, 9.50),
(8, 8, 9, 'Coca-Cola', 2, 2.50);

-- --------------------------------------------------------

--
-- Structure de la table `order_item_options`
--

CREATE TABLE `order_item_options` (
  `id` int NOT NULL,
  `order_item_id` int NOT NULL,
  `product_option_id` int DEFAULT NULL,
  `option_name_snapshot` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price_delta_snapshot` decimal(6,2) NOT NULL DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `products`
--

CREATE TABLE `products` (
  `id` int NOT NULL,
  `category` enum('entree','banhmi','dessert','boisson') COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `image_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` decimal(6,2) NOT NULL,
  `available` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `products`
--

INSERT INTO `products` (`id`, `category`, `name`, `description`, `image_url`, `price`, `available`, `sort_order`) VALUES
(1, 'entree', 'Soupe Miso', 'Bouillon dashi, tofu soyeux, wakamé et oignons verts', '/uploads/product_1_1775419562049.webp', 4.50, 1, 1),
(2, 'entree', 'Boulettes de Bœuf', 'Boulettes maison, sauce soja-gingembre, graines de sésame', '/uploads/product_2_1775419574507.webp', 6.50, 1, 2),
(3, 'entree', 'Nems', 'Nems croustillants au porc et légumes, sauce nuoc-mâm', '/uploads/product_3_1775419585104.webp', 5.50, 1, 3),
(4, 'banhmi', 'Bánh Mì Classique', 'Porc rôti, pâté, légumes marinés, coriandre, mayo sriracha', '/uploads/product_4_1775419592964.webp', 9.50, 1, 1),
(5, 'banhmi', 'Bánh Mì Poulet', 'Poulet grillé citronelle, concombre, carottes, coriandre', '/uploads/product_5_1775419601209.webp', 9.00, 1, 2),
(6, 'banhmi', 'Bánh Mì Végétarien', 'Tofu sauté, shiitake, légumes croquants, sauce hoisin', '/uploads/product_6_1775419609652.webp', 8.50, 1, 3),
(7, 'dessert', 'Perle de Coco', 'Perles de tapioca, lait de coco, mangue fraîche', '/uploads/product_7_1775419618285.webp', 5.00, 1, 1),
(8, 'dessert', 'Mochi', 'Mochi glacé — parfums : matcha, framboise ou vanille', '/uploads/product_8_1775419626672.webp', 4.50, 1, 2),
(9, 'boisson', 'Coca-Cola', NULL, NULL, 2.50, 1, 0),
(10, 'boisson', 'Café froid', NULL, NULL, 3.50, 1, 0);

-- --------------------------------------------------------

--
-- Structure de la table `product_options`
--

CREATE TABLE `product_options` (
  `id` int NOT NULL,
  `product_id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price_delta` decimal(6,2) NOT NULL DEFAULT '0.00',
  `available` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `product_options`
--

INSERT INTO `product_options` (`id`, `product_id`, `name`, `price_delta`, `available`) VALUES
(1, 4, 'Extra coriandre', 0.00, 1),
(2, 4, 'Sans piment', 0.00, 1),
(3, 4, 'Double portion', 2.50, 1),
(4, 5, 'Extra coriandre', 0.00, 1),
(5, 5, 'Sans piment', 0.00, 1),
(6, 5, 'Double portion', 2.50, 1),
(7, 6, 'Extra sauce hoisin', 0.00, 1),
(8, 6, 'Sans gluten', 0.00, 1),
(10, 8, 'Matcha', 0.00, 1),
(11, 8, 'Framboise', 0.00, 1),
(12, 8, 'Vanille', 0.00, 1);

-- --------------------------------------------------------

--
-- Structure de la table `settings`
--

CREATE TABLE `settings` (
  `key` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `settings`
--

INSERT INTO `settings` (`key`, `value`) VALUES
('service_open', 'true');

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Index pour la table `formulas`
--
ALTER TABLE `formulas`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `formula_slots`
--
ALTER TABLE `formula_slots`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_formula_id` (`formula_id`);

--
-- Index pour la table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `tracking_token` (`tracking_token`),
  ADD KEY `idx_orders_tracking_token` (`tracking_token`),
  ADD KEY `idx_orders_status` (`status`),
  ADD KEY `idx_orders_payment_status` (`payment_status`),
  ADD KEY `idx_orders_stripe_payment_intent_id` (`stripe_payment_intent_id`);

--
-- Index pour la table `order_formula_items`
--
ALTER TABLE `order_formula_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_order_formula_items_order_id` (`order_id`),
  ADD KEY `idx_formula_id` (`formula_id`);

--
-- Index pour la table `order_formula_slots`
--
ALTER TABLE `order_formula_slots`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_formula_item_id` (`order_formula_item_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Index pour la table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `idx_order_items_order_id` (`order_id`);

--
-- Index pour la table `order_item_options`
--
ALTER TABLE `order_item_options`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_option_id` (`product_option_id`),
  ADD KEY `idx_order_item_id` (`order_item_id`);

--
-- Index pour la table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `product_options`
--
ALTER TABLE `product_options`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_product_id` (`product_id`);

--
-- Index pour la table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`key`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pour la table `formulas`
--
ALTER TABLE `formulas`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT pour la table `formula_slots`
--
ALTER TABLE `formula_slots`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=44;

--
-- AUTO_INCREMENT pour la table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT pour la table `order_formula_items`
--
ALTER TABLE `order_formula_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT pour la table `order_formula_slots`
--
ALTER TABLE `order_formula_slots`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT pour la table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT pour la table `order_item_options`
--
ALTER TABLE `order_item_options`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `products`
--
ALTER TABLE `products`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT pour la table `product_options`
--
ALTER TABLE `product_options`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `formula_slots`
--
ALTER TABLE `formula_slots`
  ADD CONSTRAINT `formula_slots_ibfk_1` FOREIGN KEY (`formula_id`) REFERENCES `formulas` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `order_formula_items`
--
ALTER TABLE `order_formula_items`
  ADD CONSTRAINT `order_formula_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_formula_items_ibfk_2` FOREIGN KEY (`formula_id`) REFERENCES `formulas` (`id`) ON DELETE SET NULL;

--
-- Contraintes pour la table `order_formula_slots`
--
ALTER TABLE `order_formula_slots`
  ADD CONSTRAINT `order_formula_slots_ibfk_1` FOREIGN KEY (`order_formula_item_id`) REFERENCES `order_formula_items` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_formula_slots_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL;

--
-- Contraintes pour la table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL;

--
-- Contraintes pour la table `order_item_options`
--
ALTER TABLE `order_item_options`
  ADD CONSTRAINT `order_item_options_ibfk_1` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_item_options_ibfk_2` FOREIGN KEY (`product_option_id`) REFERENCES `product_options` (`id`) ON DELETE SET NULL;

--
-- Contraintes pour la table `product_options`
--
ALTER TABLE `product_options`
  ADD CONSTRAINT `product_options_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
