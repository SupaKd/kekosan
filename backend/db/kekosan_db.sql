-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : localhost:8889
-- Généré le : lun. 13 avr. 2026 à 12:24
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
  `badge` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `allergens` json DEFAULT NULL,
  `price` decimal(6,2) NOT NULL,
  `available` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `image_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `formulas`
--

INSERT INTO `formulas` (`id`, `name`, `description`, `badge`, `allergens`, `price`, `available`, `sort_order`, `image_url`) VALUES
(5, 'Keko speed', 'Banh mi + boisson', 'Populaire', '[]', 11.90, 1, 0, '/uploads/formula_5_1775831330990.webp'),
(6, 'Kekosan', 'Entrée  ou dessert + Banh mi + Boisson', NULL, '[]', 14.90, 1, 0, '/uploads/formula_6_1775831192515.webp');

-- --------------------------------------------------------

--
-- Structure de la table `formula_slots`
--

CREATE TABLE `formula_slots` (
  `id` int NOT NULL,
  `formula_id` int NOT NULL,
  `slot_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `allowed_categories` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `required` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `formula_slots`
--

INSERT INTO `formula_slots` (`id`, `formula_id`, `slot_name`, `allowed_categories`, `required`, `sort_order`) VALUES
(59, 5, 'Bánh mì', 'banhmi', 1, 0),
(60, 5, 'Boisson', 'boisson', 1, 1),
(61, 6, 'Bánh mì', 'banhmi', 1, 0),
(62, 6, 'Boisson', 'boisson', 1, 1),
(63, 6, 'Entrée', 'entree,dessert', 1, 2);

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
  `promo_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `discount_amount` decimal(8,2) NOT NULL DEFAULT '0.00',
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

INSERT INTO `orders` (`id`, `tracking_token`, `customer_name`, `customer_phone`, `customer_email`, `delivery_address`, `delivery_time`, `status`, `subtotal`, `delivery_fee`, `promo_code`, `discount_amount`, `total`, `payment_status`, `stripe_payment_intent_id`, `notes`, `created_at`, `updated_at`) VALUES
(1, '31450adf-35f0-46f0-9e1b-c0a337b6c377', 'supakd', '0783052412', 'supaco.digital@gmail.com', '1b Rue de la Prairie', NULL, 'delivered', 35.00, 0.00, NULL, 0.00, 35.00, 'paid', 'pi_3TItLHIVAdbyXDlk0hG6Qhmd', NULL, '2026-04-05 16:16:07', '2026-04-05 16:21:18'),
(2, '25db6849-1d9a-4b9a-8ca5-f48ca9f5bc70', 'supa kd', '0783052412', 'supaco.digital@gmail.com', '5 rue de l\'orée du bois 01630', NULL, 'pending', 24.50, 0.00, NULL, 0.00, 24.50, 'pending', 'pi_3TItUTIVAdbyXDlk28azYBA7', NULL, '2026-04-05 16:25:37', '2026-04-05 16:25:37'),
(3, 'f586db61-c984-4dd7-9401-0c701dd1f713', 'supakd', '0783052412', 'supaco.digital@gmail.com', '1 rue de la prairie, Saint-Genis-Pouilly 01630', '01:30', 'pending', 26.00, 0.00, NULL, 0.00, 26.00, 'pending', 'pi_3TJLgyIVAdbyXDlk137mb5S4', NULL, '2026-04-06 22:32:24', '2026-04-06 22:32:24'),
(4, '2cd316b6-bf96-43ab-9389-8865a0521212', 'supakd', '0783052412', 'supaco.digital@gmail.com', '1 rue de la praire, Saint-Genis-Pouilly 01630', '01:30', 'delivered', 27.00, 0.00, NULL, 0.00, 27.00, 'paid', 'pi_3TJLoRIVAdbyXDlk1g3AL3w1', NULL, '2026-04-06 22:40:07', '2026-04-07 19:34:23'),
(5, '9b663614-c025-4472-b248-a1abafc0d1d4', 'supakd', '0783052412', 'supaco.digital@gmail.com', '1 rue de la prairie, Saint-Genis-Pouilly 01630', '23:45', 'delivered', 27.80, 0.00, NULL, 0.00, 27.80, 'paid', 'pi_3TJgtLIVAdbyXDlk0AUjDWkH', NULL, '2026-04-07 21:10:35', '2026-04-07 21:19:43'),
(6, 'f873ccd5-2b2e-4145-ba61-a75f2a3025d0', 'supakd', '0783052412', 'supaco.digital@gmail.com', '1 rue racine, Saint-Genis-Pouilly 01630', '23:45', 'delivered', 27.80, 0.00, NULL, 0.00, 27.80, 'paid', 'pi_3TJgxNIVAdbyXDlk15dvuK03', NULL, '2026-04-07 21:14:46', '2026-04-07 21:19:44'),
(7, '3b527ce1-54c5-4d14-93c1-e43d8d30f784', 'koko', '0783052412', 'supaco.digital@gmail.com', '1 rue de lfeurs, Saint-Genis-Pouilly 01630', '00:15', 'delivered', 27.80, 0.00, NULL, 0.00, 27.80, 'paid', 'pi_3TJh1YIVAdbyXDlk1BMLKam8', NULL, '2026-04-07 21:19:04', '2026-04-07 22:12:07'),
(8, '96cb7d22-1868-4586-91e5-8a05f3fc1551', 'supakd', '0783052412', 'supaco.digital@gmail.com', '1 rue des lob, Saint-Genis-Pouilly 01630', '00:30', 'delivered', 21.00, 0.00, NULL, 0.00, 21.00, 'paid', 'pi_3TJh35IVAdbyXDlk2q83D3yy', NULL, '2026-04-07 21:20:39', '2026-04-07 22:12:10'),
(9, 'f219bb97-e895-41d2-bb8e-04a19661c787', 'supaksd', '0783052412', 'supaco.digital@gmail.com', '1 rue racine, Saint-Genis-Pouilly 01630', '11:00', 'delivered', 11.90, 0.00, NULL, 0.00, 16.90, 'paid', 'pi_3TJiQwIVAdbyXDlk0pm3BwOE', NULL, '2026-04-07 22:49:22', '2026-04-07 22:50:30'),
(10, '29c581a6-1bcc-4416-9868-132f732e50de', 'supakd', '0783052412', 'supaco.digital@gmail.com', '1 rue de la prairie, Saint-Genis-Pouilly 01630', '11:00', 'delivered', 13.90, 5.00, NULL, 0.00, 18.90, 'paid', 'pi_3TK4SkIVAdbyXDlk1H7e4AR4', NULL, '2026-04-08 22:20:42', '2026-04-08 22:22:57'),
(11, '6af2cfa1-b955-4ac3-86f7-14672a0babca', 'sup', '0783052412', 'supaco.digital@gmail.com', '1 rue de la prairie, Saint-Genis-Pouilly 01630', '11:30', 'delivered', 27.80, 0.00, NULL, 0.00, 27.80, 'paid', 'pi_3TK5E8IVAdbyXDlk1aehnoCb', NULL, '2026-04-08 23:09:40', '2026-04-08 23:12:12'),
(12, '0b7087e4-ced4-42a7-b917-697e6ad5292b', 'supakd', '0783052412', 'supaco.digital@gmail.com', '1 rue de la prairie, Saint-Genis-Pouilly 01630', '11:00', 'delivered', 27.80, 0.00, 'BIENVENUE10', 2.00, 25.80, 'paid', 'pi_3TKR7jIVAdbyXDlk0juEhyve', NULL, '2026-04-09 22:32:30', '2026-04-09 22:34:11'),
(13, '1b14b883-9a70-499f-b276-a15549e5fcfc', 'asxds', '0783052412', 'supaco.digital@gmail.com', '1 ru de la prairie, Saint-Genis-Pouilly 01630', '11:30', 'delivered', 13.90, 5.00, NULL, 0.00, 18.90, 'paid', 'pi_3TKRGUIVAdbyXDlk2ItK13WU', NULL, '2026-04-09 22:41:33', '2026-04-09 22:45:03'),
(14, '04761802-29e4-4984-ba14-ecd0ed38f133', 'svgrbrwt', '0783052412', 'supaco.digital@gmail.com', '2 rjue des seff, Saint-Genis-Pouilly 01630', '12:00', 'delivered', 13.90, 5.00, NULL, 0.00, 18.90, 'paid', 'pi_3TKRHMIVAdbyXDlk0r9oQOnP', NULL, '2026-04-09 22:42:28', '2026-04-09 22:45:00'),
(15, 'f8bbdf77-af30-4128-82d8-ce185466c4ae', 'supad', '0783052412', 'supaco.digital@gmail.com', '1 reef freg, Saint-Genis-Pouilly 01630', '11:00', 'delivered', 9.00, 5.00, NULL, 0.00, 14.00, 'paid', 'pi_3TKSCBIVAdbyXDlk2BRr5fK5', NULL, '2026-04-09 23:41:10', '2026-04-10 14:10:52'),
(16, '9fe3904b-656d-4506-a74b-7a6471b729c8', 'supakd', '0783052412', 'supaco.digital@gmail.com', '1 rue de la prairie, Saint-Genis-Pouilly 01630', '11:30', 'delivered', 15.90, 5.00, NULL, 0.00, 20.90, 'paid', 'pi_3TKljtIVAdbyXDlk0POvvmEG', NULL, '2026-04-10 20:33:16', '2026-04-10 22:37:05'),
(17, '1b759b4b-1185-48ec-b1b0-4d3611578b86', 'kevin', '0783052412', 'supaco.digital@gmail.com', '1 rue de la prairie, Saint-Genis-Pouilly 01630', '11:30', 'delivered', 24.80, 0.00, NULL, 0.00, 24.80, 'paid', 'pi_3TLWzRIVAdbyXDlk1DqG5v7D', NULL, '2026-04-12 23:00:28', '2026-04-12 23:54:52'),
(18, 'd1d96b92-41bd-40b9-83e4-a927b4f10e63', 'supa', '0783052412', 'supaco.digital@gmail.com', '1 rue de la praire, Saint-Genis-Pouilly 01630', '11:15', 'cancelled', 24.80, 0.00, NULL, 0.00, 24.80, 'refunded', 'pi_3TLj9OIVAdbyXDlk1JhygVzN', NULL, '2026-04-13 11:59:34', '2026-04-13 12:00:31');

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
(6, 9, 5, 'Keko speed', 11.90, 1),
(7, 10, 6, 'Kekosan', 13.90, 1),
(8, 11, 6, 'Kekosan', 13.90, 2),
(9, 12, 6, 'Kekosan', 13.90, 2),
(10, 13, 6, 'Kekosan', 13.90, 1),
(11, 14, 6, 'Kekosan', 13.90, 1),
(12, 16, 6, 'Kekosan', 15.90, 1),
(13, 17, 6, 'Kekosan', 14.90, 1),
(14, 18, 6, 'Kekosan', 14.90, 1);

-- --------------------------------------------------------

--
-- Structure de la table `order_formula_slots`
--

CREATE TABLE `order_formula_slots` (
  `id` int NOT NULL,
  `order_formula_item_id` int NOT NULL,
  `slot_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` int DEFAULT NULL,
  `product_name_snapshot` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price_supplement_snapshot` decimal(5,2) NOT NULL DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `order_formula_slots`
--

INSERT INTO `order_formula_slots` (`id`, `order_formula_item_id`, `slot_name`, `product_id`, `product_name_snapshot`, `price_supplement_snapshot`) VALUES
(1, 1, 'Entrée', 1, 'Soupe Miso', 0.00),
(2, 1, 'Bánh Mì', 5, 'Bánh Mì Poulet', 0.00),
(3, 1, 'Dessert', 7, 'Perle de Coco', 0.00),
(4, 2, 'Entrée', 2, 'Boulettes de Bœuf', 0.00),
(5, 2, 'Bánh Mì', 4, 'Bánh Mì Classique', 0.00),
(6, 3, 'Entrée', 1, 'Soupe Miso', 0.00),
(7, 3, 'Bánh mì', 4, 'Bánh Mì Classique', 0.00),
(8, 3, 'Boisson', 10, 'Café froid', 0.00),
(9, 4, 'Bánh mì', 5, 'Bánh Mì Poulet', 0.00),
(10, 4, 'Boisson', 9, 'Coca-Cola', 0.00),
(11, 4, 'Dessert', 7, 'Perle de Coco', 0.00),
(12, 5, 'Entrée', 1, 'Soupe Miso', 0.00),
(13, 5, 'Bánh mì', 4, 'Bánh Mì Classique', 0.00),
(14, 5, 'Boisson', 10, 'Café froid', 0.00),
(15, 6, 'Bánh mì', 4, 'Bánh Mì Classique', 0.00),
(16, 6, 'Boisson', 10, 'Café froid', 0.00),
(17, 7, 'Entrée', 8, 'Mochi', 0.00),
(18, 7, 'Bánh mì', 4, 'Bánh Mì Classique', 0.00),
(19, 7, 'Boisson', 10, 'Café froid', 0.00),
(20, 8, 'Entrée', 7, 'Perle de Coco', 0.00),
(21, 8, 'Bánh mì', 4, 'Bánh Mì Classique', 0.00),
(22, 8, 'Boisson', 10, 'Café froid', 0.00),
(23, 9, 'Entrée', 1, 'Soupe Miso', 0.00),
(24, 9, 'Bánh mì', 4, 'Bánh Mì Classique', 0.00),
(25, 9, 'Boisson', 10, 'Café froid', 0.00),
(26, 10, 'Entrée', 1, 'Soupe Miso', 0.00),
(27, 10, 'Bánh mì', 5, 'Bánh Mì Poulet', 0.00),
(28, 10, 'Boisson', 10, 'Café froid', 0.00),
(29, 11, 'Entrée', 2, 'Boulettes de Bœuf', 0.00),
(30, 11, 'Bánh mì', 5, 'Bánh Mì Poulet', 0.00),
(31, 11, 'Boisson', 9, 'Coca-Cola', 0.00),
(32, 12, 'Entrée', 2, 'Pinces de crabes', 0.00),
(33, 12, 'Bánh mì', 4, 'Bánh Mì Classique', 0.00),
(34, 12, 'Boisson', 10, 'Café froid', 1.00),
(35, 13, 'Entrée', 2, 'Pinces de crabes', 0.00),
(36, 13, 'Bánh mì', 4, 'Bánh Mì Classique', 0.00),
(37, 13, 'Boisson', 9, 'Coca-Cola', 0.00),
(38, 14, 'Entrée', 3, 'Nems', 0.00),
(39, 14, 'Bánh mì', 4, 'Bánh Mì Classique', 0.00),
(40, 14, 'Boisson', 9, 'Coca-Cola', 0.00);

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
(8, 8, 9, 'Coca-Cola', 2, 2.50),
(9, 15, 5, 'Bánh Mì Poulet', 1, 9.00),
(10, 17, 2, 'Pinces de crabes', 1, 9.90),
(11, 18, 4, 'Bánh Mì Classique', 1, 9.90);

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
  `badge` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `allergens` json DEFAULT NULL,
  `image_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` decimal(6,2) NOT NULL,
  `available` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `formula_quantity` int DEFAULT NULL,
  `price_supplement` decimal(5,2) NOT NULL DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `products`
--

INSERT INTO `products` (`id`, `category`, `name`, `description`, `badge`, `allergens`, `image_url`, `price`, `available`, `sort_order`, `formula_quantity`, `price_supplement`) VALUES
(1, 'entree', 'Soupe Miso', 'Bouillon dashi, tofu soyeux, wakamé et oignons verts', 'Populaire', '[]', '/uploads/product_1_1775831376293.webp', 4.50, 1, 1, NULL, 0.00),
(2, 'entree', 'Pinces de crabes', '6 Pinces de crabe à la chair tendre et savoureuse, légèrement sucrée. Servies prêtes à déguster, idéales en entrée ou à partager.', 'Épicé 🌶', '[\"gluten\", \"crustacés\", \"oeufs\", \"poisson\", \"arachides\"]', '/uploads/product_2_1776034742592.webp', 9.90, 1, 2, 2, 0.00),
(3, 'entree', 'Nems', '6 nems croustillants au porc et légumes, sauce nuoc-mâm', NULL, NULL, '/uploads/product_3_1775831520972.webp', 9.90, 1, 3, 2, 0.00),
(4, 'banhmi', 'Bánh Mì Classique', 'Porc rôti, pâté, légumes marinés, coriandre, mayo sriracha', NULL, NULL, '/uploads/product_4_1775419592964.webp', 9.90, 1, 1, NULL, 0.00),
(5, 'banhmi', 'Bánh Mì Poulet', 'Poulet grillé citronelle, concombre, carottes, coriandre', NULL, NULL, '/uploads/product_5_1775419601209.webp', 9.90, 1, 2, NULL, 0.00),
(6, 'banhmi', 'Bánh Mì Végétarien', 'Tofu sauté, shiitake, légumes croquants, sauce hoisin', NULL, NULL, '/uploads/product_6_1775419609652.webp', 9.90, 1, 3, NULL, 0.00),
(7, 'dessert', 'Perle de Coco', 'Perles de tapioca, lait de coco, mangue fraîche', NULL, NULL, '/uploads/product_7_1776034706685.webp', 3.90, 1, 1, NULL, 0.00),
(8, 'dessert', 'Mochi glacé', 'Mochi glacé — parfums : matcha, framboise ou vanille', NULL, NULL, '/uploads/product_8_1775852595356.webp', 4.50, 1, 2, NULL, 0.00),
(9, 'boisson', 'Coca-Cola', NULL, NULL, NULL, '/uploads/product_9_1776034533999.webp', 3.00, 1, 0, NULL, 0.00),
(10, 'boisson', 'Café froid', NULL, NULL, NULL, '/uploads/product_10_1776034505681.webp', 3.50, 1, 0, NULL, 1.00),
(11, 'boisson', 'Coca-Cola zero', NULL, NULL, NULL, '/uploads/product_11_1776034576456.webp', 3.00, 1, 0, NULL, 0.00),
(12, 'boisson', 'Fuzetea', NULL, NULL, NULL, '/uploads/product_12_1776034610488.webp', 3.00, 1, 0, NULL, 0.00),
(13, 'boisson', 'San Pellegrino', NULL, NULL, NULL, '/uploads/product_13_1776034671775.webp', 3.00, 1, 0, NULL, 0.00),
(14, 'boisson', 'Red bull', NULL, NULL, NULL, '/uploads/product_14_1776034645250.webp', 3.50, 1, 0, NULL, 1.00);

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
(4, 5, 'Extra coriandre', 0.00, 1),
(5, 5, 'Sans piment', 0.00, 1),
(6, 5, 'Double portion', 2.50, 1),
(7, 6, 'Extra sauce hoisin', 0.00, 1),
(8, 6, 'Sans gluten', 0.00, 1),
(10, 8, 'Matcha', 0.00, 1),
(11, 8, 'Framboise', 0.00, 1),
(12, 8, 'Vanille', 0.00, 1),
(13, 3, 'Sauce nems', 0.00, 1),
(14, 2, 'Sauce piment', 0.00, 1),
(15, 4, 'piquant', 0.00, 1);

-- --------------------------------------------------------

--
-- Structure de la table `promo_codes`
--

CREATE TABLE `promo_codes` (
  `id` int NOT NULL,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('percent','fixed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` decimal(8,2) NOT NULL,
  `starts_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `promo_codes`
--

INSERT INTO `promo_codes` (`id`, `code`, `type`, `value`, `starts_at`, `expires_at`, `active`, `created_at`, `updated_at`) VALUES
(2, 'BIENVENUE10', 'fixed', 2.00, NULL, NULL, 0, '2026-04-08 23:29:53', '2026-04-12 23:36:05'),
(3, 'KEKOSAN10', 'percent', 10.00, NULL, NULL, 0, '2026-04-12 23:35:30', '2026-04-12 23:37:05');

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
('closed_days', '[]'),
('closing_hour', '15'),
('delivery_fee', '5'),
('free_delivery_threshold', '20'),
('maintenance_message', 'Ouverture du service le 20 avril, à très vite!'),
('max_orders_per_slot', '5'),
('min_delivery_delay', '30'),
('min_order_amount', '5'),
('opening_hour', '11'),
('service_open', 'false'),
('slot_interval', '15');

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
-- Index pour la table `promo_codes`
--
ALTER TABLE `promo_codes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `idx_promo_active` (`active`);

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
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT pour la table `formulas`
--
ALTER TABLE `formulas`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT pour la table `formula_slots`
--
ALTER TABLE `formula_slots`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=64;

--
-- AUTO_INCREMENT pour la table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT pour la table `order_formula_items`
--
ALTER TABLE `order_formula_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT pour la table `order_formula_slots`
--
ALTER TABLE `order_formula_slots`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT pour la table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT pour la table `order_item_options`
--
ALTER TABLE `order_item_options`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `products`
--
ALTER TABLE `products`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT pour la table `product_options`
--
ALTER TABLE `product_options`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT pour la table `promo_codes`
--
ALTER TABLE `promo_codes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

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
