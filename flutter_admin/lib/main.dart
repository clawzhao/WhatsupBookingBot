import 'package:flutter/material.dart';

// UI Standards - Professional Design System
class UITheme {
  // Colors - Professional Palette
  static const Color primary = Color(0xFF2563EB);      // Primary Blue
  static const Color primaryDark = Color(0xFF1E40AF);  // Primary Dark
  static const Color success = Color(0xFF10B981);      // Success Green
  static const Color warning = Color(0xFFF59E0B);      // Warning Orange
  static const Color danger = Color(0xFFEF4444);       // Danger Red
  static const Color info = Color(0xFF3B82F6);         // Info Light Blue
  static const Color grayLight = Color(0xFFF3F4F6);    // Gray Light
  static const Color grayDark = Color(0xFF1F2937);     // Gray Dark
  static const Color grayMedium = Color(0xFF9CA3AF);   // Gray Medium
  static const Color white = Color(0xFFFFFFFF);
  static const Color background = Color(0xFFF9FAFB);
  
  // Spacing - 4px base unit
  static const double spacing4 = 4.0;
  static const double spacing8 = 8.0;
  static const double spacing12 = 12.0;
  static const double spacing16 = 16.0;
  static const double spacing20 = 20.0;
  static const double spacing24 = 24.0;
  static const double spacing32 = 32.0;
  
  // Border Radius
  static const double radiusSmall = 8.0;
  static const double radiusMedium = 12.0;
}

void main() {
  runApp(const SwimmingBookingAdminApp());
}

class SwimmingBookingAdminApp extends StatelessWidget {
  const SwimmingBookingAdminApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Swimming Booking System - Admin',
      theme: ThemeData(
        useMaterial3: true,
        primaryColor: UITheme.primary,
        scaffoldBackgroundColor: UITheme.background,
        appBarTheme: const AppBarTheme(
          backgroundColor: UITheme.primary,
          elevation: 0,
          centerTitle: false,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: UITheme.primary,
            foregroundColor: UITheme.white,
            padding: const EdgeInsets.symmetric(
              horizontal: UITheme.spacing16,
              vertical: UITheme.spacing12,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(UITheme.radiusSmall),
            ),
          ),
        ),
      ),
      home: const AdminDashboard(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class AdminDashboard extends StatefulWidget {
  const AdminDashboard({Key? key}) : super(key: key);

  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Swimming Booking System'),
      ),
      body: Row(
        children: [
          NavigationRail(
            selectedIndex: _selectedIndex,
            onDestinationSelected: (int index) {
              setState(() {
                _selectedIndex = index;
              });
            },
            destinations: const [
              NavigationRailDestination(
                icon: Icon(Icons.dashboard),
                label: Text('Dashboard'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.search),
                label: Text('Search'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.book),
                label: Text('Q&A'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.calendar_today),
                label: Text('Bookings'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.settings),
                label: Text('Settings'),
              ),
            ],
          ),
          Expanded(
            child: _buildContent(_selectedIndex),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(int index) {
    switch (index) {
      case 0:
        return const DashboardView();
      case 1:
        return const SearchView();
      case 2:
        return const QAView();
      case 3:
        return const BookingsView();
      case 4:
        return const SettingsView();
      default:
        return const DashboardView();
    }
  }
}

// DASHBOARD VIEW
class DashboardView extends StatelessWidget {
  const DashboardView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(UITheme.spacing32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Dashboard',
            style: Theme.of(context).textTheme.headlineLarge?.copyWith(
              color: UITheme.grayDark,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: UITheme.spacing8),
          Text(
            'Real-time system overview and key metrics',
            style: TextStyle(color: UITheme.grayMedium, fontSize: 14),
          ),
          const SizedBox(height: UITheme.spacing32),
          GridView.count(
            crossAxisCount: 3,
            mainAxisSpacing: UITheme.spacing20,
            crossAxisSpacing: UITheme.spacing20,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              StatCard(label: 'Total Bookings', value: '128', color: UITheme.primary),
              StatCard(label: 'Confirmed', value: '98', color: UITheme.success),
              StatCard(label: 'Pending', value: '20', color: UITheme.warning),
              StatCard(label: 'Cancelled', value: '10', color: UITheme.danger),
              StatCard(label: 'Active Coaches', value: '5', color: const Color(0xFF6366F1)),
              StatCard(label: 'Total Students', value: '156', color: const Color(0xFF8B5CF6)),
            ],
          ),
        ],
      ),
    );
  }
}

class StatCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const StatCard({
    Key? key,
    required this.label,
    required this.value,
    required this.color,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(UITheme.radiusMedium),
        side: BorderSide(color: color, width: 4),
      ),
      child: Padding(
        padding: const EdgeInsets.all(UITheme.spacing20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: UITheme.grayMedium,
                letterSpacing: 0.5,
              ),
            ),
            Text(
              value,
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: UITheme.grayDark,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// SEARCH VIEW
class SearchView extends StatefulWidget {
  const SearchView({Key? key}) : super(key: key);

  @override
  State<SearchView> createState() => _SearchViewState();
}

class _SearchViewState extends State<SearchView> {
  String _searchType = 'students';

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(UITheme.spacing32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Search & Find',
            style: Theme.of(context).textTheme.headlineLarge?.copyWith(
              color: UITheme.grayDark,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: UITheme.spacing8),
          Text(
            'Search for students, coaches, bookings, and chat history',
            style: TextStyle(color: UITheme.grayMedium, fontSize: 14),
          ),
          const SizedBox(height: UITheme.spacing32),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(UITheme.spacing24),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        flex: 1,
                        child: DropdownButtonFormField<String>(
                          value: _searchType,
                          items: const [
                            DropdownMenuItem(value: 'students', child: Text('Students')),
                            DropdownMenuItem(value: 'coaches', child: Text('Coaches')),
                            DropdownMenuItem(value: 'bookings', child: Text('Bookings')),
                            DropdownMenuItem(value: 'chats', child: Text('Chat History')),
                          ],
                          onChanged: (value) {
                            setState(() => _searchType = value ?? 'students');
                          },
                          decoration: const InputDecoration(labelText: 'Search Type'),
                        ),
                      ),
                      const SizedBox(width: UITheme.spacing16),
                      Expanded(
                        flex: 2,
                        child: TextField(
                          decoration: InputDecoration(
                            hintText: 'Search $_searchType...',
                            prefixIcon: const Icon(Icons.search),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(UITheme.radiusSmall),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: UITheme.spacing16),
                      ElevatedButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.search),
                        label: const Text('Search'),
                      ),
                    ],
                  ),
                  const SizedBox(height: UITheme.spacing24),
                  Center(
                    child: Text(
                      'Enter a search query to find records',
                      style: TextStyle(color: UITheme.grayMedium, fontSize: 14),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// Q&A VIEW
class QAView extends StatefulWidget {
  const QAView({Key? key}) : super(key: key);

  @override
  State<QAView> createState() => _QAViewState();
}

class _QAViewState extends State<QAView> {
  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(UITheme.spacing32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Q&A Knowledge Base',
                    style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                      color: UITheme.grayDark,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: UITheme.spacing8),
                  Text(
                    'Manage frequently asked questions',
                    style: TextStyle(color: UITheme.grayMedium, fontSize: 14),
                  ),
                ],
              ),
              ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.add),
                label: const Text('Add Q&A'),
              ),
            ],
          ),
          const SizedBox(height: UITheme.spacing32),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(UITheme.spacing32),
              child: Center(
                child: Text(
                  'No Q&A pairs yet. Add your first one!',
                  style: TextStyle(color: UITheme.grayMedium, fontSize: 14),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// BOOKINGS VIEW
class BookingsView extends StatelessWidget {
  const BookingsView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(UITheme.spacing32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Bookings Management',
                    style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                      color: UITheme.grayDark,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: UITheme.spacing8),
                  Text(
                    'View and manage all swimming lesson bookings',
                    style: TextStyle(color: UITheme.grayMedium, fontSize: 14),
                  ),
                ],
              ),
              ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.download),
                label: const Text('Export'),
              ),
            ],
          ),
          const SizedBox(height: UITheme.spacing32),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(UITheme.spacing32),
              child: Center(
                child: Text(
                  'No bookings found',
                  style: TextStyle(color: UITheme.grayMedium, fontSize: 14),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// SETTINGS VIEW
class SettingsView extends StatefulWidget {
  const SettingsView({Key? key}) : super(key: key);

  @override
  State<SettingsView> createState() => _SettingsViewState();
}

class _SettingsViewState extends State<SettingsView> {
  late TextEditingController _reminderTimeController;
  late TextEditingController _softHoldController;

  @override
  void initState() {
    super.initState();
    _reminderTimeController = TextEditingController(text: '07:00');
    _softHoldController = TextEditingController(text: '60');
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(UITheme.spacing32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Settings',
            style: Theme.of(context).textTheme.headlineLarge?.copyWith(
              color: UITheme.grayDark,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: UITheme.spacing8),
          Text(
            'Configure system behavior and preferences',
            style: TextStyle(color: UITheme.grayMedium, fontSize: 14),
          ),
          const SizedBox(height: UITheme.spacing32),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(UITheme.spacing24),
              child: SizedBox(
                width: 500,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'System Configuration',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: UITheme.spacing20),
                    TextField(
                      controller: _reminderTimeController,
                      decoration: const InputDecoration(
                        labelText: 'Daily Reminder Time',
                        hintText: 'HH:MM',
                      ),
                    ),
                    const SizedBox(height: UITheme.spacing20),
                    TextField(
                      controller: _softHoldController,
                      decoration: const InputDecoration(
                        labelText: 'Soft-Hold Duration (seconds)',
                      ),
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: UITheme.spacing24),
                    ElevatedButton.icon(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Settings saved!'),
                            backgroundColor: UITheme.success,
                          ),
                        );
                      },
                      icon: const Icon(Icons.save),
                      label: const Text('Save Settings'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _reminderTimeController.dispose();
    _softHoldController.dispose();
    super.dispose();
  }
}
