import 'package:flutter/material.dart';

class AppTheme {
  // MonsoonProof brand colors
  static const Color primaryColor = Color(0xFF164E41); // Forest green
  static const Color secondaryColor = Color(0xFF147D72); // Teal
  static const Color accentColor = Color(0xFFD99A32); // Amber

  // Status Colors
  static const Color emergencyColor = Color(0xFFE53935); // Crimson
  static const Color highPriorityColor = Color(0xFFFB8C00); // Amber/Orange
  static const Color mediumPriorityColor = Color(0xFFFDD835); // Yellow
  static const Color lowPriorityColor = Color(0xFF4CAF50); // Green

  // Neutral Colors (Light Theme)
  static const Color lightBg = Color(0xFFF4F7F5);
  static const Color lightSurface = Colors.white;
  static const Color lightTextPrimary = Color(0xFF0F172A);
  static const Color lightTextSecondary = Color(0xFF475569);

  // Neutral Colors (Dark Theme)
  static const Color darkBg = Color(0xFF0B0F19);
  static const Color darkSurface = Color(0xFF151F32);
  static const Color darkTextPrimary = Color(0xFFF1F5F9);
  static const Color darkTextSecondary = Color(0xFF94A3B8);

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: const ColorScheme.light(
        primary: primaryColor,
        secondary: secondaryColor,
        tertiary: accentColor,
        error: emergencyColor,
        surface: lightSurface,
        onSurface: lightTextPrimary,
      ),
      scaffoldBackgroundColor: lightBg,
      cardTheme: CardThemeData(
        color: lightSurface,
        elevation: 2,
        shadowColor: const Color(0x0D000000),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: lightSurface,
        foregroundColor: lightTextPrimary,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          color: lightTextPrimary,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.white,
          elevation: 0,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(color: lightTextPrimary, fontSize: 28, fontWeight: FontWeight.bold, letterSpacing: -0.5),
        headlineMedium: TextStyle(color: lightTextPrimary, fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: -0.5),
        titleLarge: TextStyle(color: lightTextPrimary, fontSize: 18, fontWeight: FontWeight.w600),
        bodyLarge: TextStyle(color: lightTextPrimary, fontSize: 16, height: 1.5),
        bodyMedium: TextStyle(color: lightTextSecondary, fontSize: 14, height: 1.5),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: const ColorScheme.dark(
        primary: primaryColor,
        secondary: secondaryColor,
        tertiary: accentColor,
        error: emergencyColor,
        surface: darkSurface,
        onSurface: darkTextPrimary,
      ),
      scaffoldBackgroundColor: darkBg,
      cardTheme: CardThemeData(
        color: darkSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: darkSurface,
        foregroundColor: darkTextPrimary,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          color: darkTextPrimary,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.white,
          elevation: 0,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(color: darkTextPrimary, fontSize: 28, fontWeight: FontWeight.bold, letterSpacing: -0.5),
        headlineMedium: TextStyle(color: darkTextPrimary, fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: -0.5),
        titleLarge: TextStyle(color: darkTextPrimary, fontSize: 18, fontWeight: FontWeight.w600),
        bodyLarge: TextStyle(color: darkTextPrimary, fontSize: 16, height: 1.5),
        bodyMedium: TextStyle(color: darkTextSecondary, fontSize: 14, height: 1.5),
      ),
    );
  }
}
