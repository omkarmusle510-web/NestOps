import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'resident_home_screen.dart';
import '../../profile/screens/profile_screen.dart';

class ResidentMainScreen extends ConsumerStatefulWidget {
  const ResidentMainScreen({super.key});

  @override
  ConsumerState<ResidentMainScreen> createState() => _ResidentMainScreenState();
}

class _ResidentMainScreenState extends ConsumerState<ResidentMainScreen> {
  int _selectedIndex = 0;

  final List<Widget> _screens = const [
    ResidentHomeScreen(),
    ProfileScreen(),
  ];

  void _showOptionsBottomSheet(BuildContext context) {
    final theme = Theme.of(context);
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Quick Actions',
                      style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ListTile(
                  leading: CircleAvatar(
                    backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.12),
                    child: Icon(Icons.report_problem_rounded, color: theme.colorScheme.primary),
                  ),
                  title: const Text('Report Issue', style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: const Text('Drainage, seepage, flooding, shared assets'),
                  onTap: () {
                    Navigator.pop(context);
                    context.push('/report-issue');
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    // Index map: 0 Home, 1 Actions (sheet), 2 Profile
    final navIndex = _selectedIndex == 0 ? 0 : 2;

    return Scaffold(
      body: IndexedStack(
        index: _selectedIndex,
        children: _screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: navIndex,
        onDestinationSelected: (index) {
          if (index == 1) {
            _showOptionsBottomSheet(context);
          } else if (index == 0) {
            setState(() => _selectedIndex = 0);
          } else if (index == 2) {
            setState(() => _selectedIndex = 1);
          }
        },
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.add_circle_outline, color: Theme.of(context).colorScheme.secondary),
            selectedIcon: Icon(Icons.add_circle, color: Theme.of(context).colorScheme.secondary),
            label: 'Report',
          ),
          const NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
