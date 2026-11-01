import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'worker_home_screen.dart';
import 'worker_history_screen.dart';
import '../../profile/screens/profile_screen.dart';

class WorkerMainScreen extends ConsumerStatefulWidget {
  const WorkerMainScreen({super.key});

  @override
  ConsumerState<WorkerMainScreen> createState() => _WorkerMainScreenState();
}

class _WorkerMainScreenState extends ConsumerState<WorkerMainScreen> {
  int _selectedIndex = 0;

  final List<Widget> _screens = const [
    WorkerHomeScreen(),
    WorkerHistoryScreen(),
    ProfileScreen(),
  ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _selectedIndex,
        children: _screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: _onItemTapped,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.history_outlined),
            selectedIcon: Icon(Icons.history),
            label: 'History',
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
