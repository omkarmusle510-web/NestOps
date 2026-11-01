import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final localeProvider = StateNotifierProvider<LocaleNotifier, String>((ref) {
  return LocaleNotifier();
});

class LocaleNotifier extends StateNotifier<String> {
  LocaleNotifier() : super('en') {
    _loadLocale();
  }

  Future<void> _loadLocale() async {
    final prefs = await SharedPreferences.getInstance();
    final savedLocale = prefs.getString('app_locale') ?? 'en';
    state = savedLocale;
  }

  Future<void> setLocale(String localeCode) async {
    state = localeCode;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('app_locale', localeCode);
  }
}

// Simple translation helper for demonstration
String t(String key, String locale) {
  const Map<String, Map<String, String>> dictionary = {
    'en': {
      'language_settings': 'Language Settings',
      'switch_to_hindi': 'Switch to Hindi',
      'switch_to_english': 'Switch to English',
      'profile': 'Profile',
      'logout': 'Logout',
    },
    'hi': {
      'language_settings': 'भाषा सेटिंग (Language Settings)',
      'switch_to_hindi': 'हिन्दी में बदलें (Switch to Hindi)',
      'switch_to_english': 'अंग्रेज़ी में बदलें (Switch to English)',
      'profile': 'प्रोफ़ाइल (Profile)',
      'logout': 'लॉग आउट (Logout)',
    },
  };

  return dictionary[locale]?[key] ?? dictionary['en']?[key] ?? key;
}
