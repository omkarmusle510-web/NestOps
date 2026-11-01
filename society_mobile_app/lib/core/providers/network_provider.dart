import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum NetworkStatus {
  online,
  offline,
}

class NetworkNotifier extends Notifier<NetworkStatus> {
  @override
  NetworkStatus build() {
    _init();
    return NetworkStatus.online; // Default assumption until we check
  }

  void _init() {
    Connectivity().onConnectivityChanged.listen((List<ConnectivityResult> results) {
      if (results.contains(ConnectivityResult.none)) {
        state = NetworkStatus.offline;
      } else {
        state = NetworkStatus.online;
      }
    });

    // Check initial state
    Connectivity().checkConnectivity().then((List<ConnectivityResult> results) {
      if (results.contains(ConnectivityResult.none)) {
        state = NetworkStatus.offline;
      }
    });
  }
}

final networkProvider = NotifierProvider<NetworkNotifier, NetworkStatus>(() {
  return NetworkNotifier();
});
