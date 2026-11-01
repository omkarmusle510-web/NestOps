import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'guard_home_screen.dart';
import '../../profile/screens/profile_screen.dart';

class GuardMainScreen extends ConsumerStatefulWidget {
  const GuardMainScreen({super.key});

  @override
  ConsumerState<GuardMainScreen> createState() => _GuardMainScreenState();
}

class _GuardMainScreenState extends ConsumerState<GuardMainScreen> {
  int _selectedIndex = 0;

  final List<Widget> _screens = const [
    GuardHomeScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _selectedIndex,
        children: _screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (i) => setState(() => _selectedIndex = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.security_outlined),
            selectedIcon: Icon(Icons.security),
            label: 'Gate',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
