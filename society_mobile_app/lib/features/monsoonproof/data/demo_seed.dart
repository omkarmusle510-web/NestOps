import '../models/monsoonproof_enums.dart';
import '../models/monsoonproof_models.dart';

class DemoPersona {
  final String id;
  final String name;
  final String role; // resident | worker
  final String? societyId;
  final String? societyName;
  final String? flatId;
  final String? category;

  const DemoPersona({
    required this.id,
    required this.name,
    required this.role,
    this.societyId,
    this.societyName,
    this.flatId,
    this.category,
  });
}

class MonsoonProofDemoSeed {
  static const societies = [
    DemoSociety(id: 'sea_view', name: 'Sea View CHS', shortName: 'Sea View'),
    DemoSociety(id: 'palm_heights', name: 'Palm Heights', shortName: 'Palm Heights'),
    DemoSociety(id: 'harbor', name: 'Harbor Residences', shortName: 'Harbor'),
  ];

  static const federationOrgId = 'federation';
  static const federationOrgName = 'Coastal Federation';

  static const sharedAssets = [
    SharedAsset(
      id: 'asset_d03',
      code: 'D-03',
      name: 'Shared drainage line D-03',
      description: 'Cross-society drainage trunk serving Sea View, Palm Heights, and Harbor Residences.',
      societyIds: ['sea_view', 'palm_heights', 'harbor'],
    ),
    SharedAsset(
      id: 'asset_d01',
      code: 'D-01',
      name: 'Block A storm drain',
      description: 'Local storm drain for Sea View Block A.',
      societyIds: ['sea_view'],
    ),
  ];

  static const personas = [
    DemoPersona(
      id: 'demo_res_sea',
      name: 'Asha Mehta',
      role: 'resident',
      societyId: 'sea_view',
      societyName: 'Sea View CHS',
      flatId: 'A-1204',
    ),
    DemoPersona(
      id: 'demo_res_palm',
      name: 'Rahul Kapoor',
      role: 'resident',
      societyId: 'palm_heights',
      societyName: 'Palm Heights',
      flatId: 'B-803',
    ),
    DemoPersona(
      id: 'demo_res_harbor',
      name: 'Priya Nair',
      role: 'resident',
      societyId: 'harbor',
      societyName: 'Harbor Residences',
      flatId: 'C-502',
    ),
    DemoPersona(
      id: 'demo_worker',
      name: 'Vikram Drainage',
      role: 'worker',
      category: 'drainage',
    ),
  ];

  static DemoSociety societyById(String id) =>
      societies.firstWhere((s) => s.id == id, orElse: () => societies.first);

  static SharedAsset? assetById(String? id) {
    if (id == null) return null;
    try {
      return sharedAssets.firstWhere((a) => a.id == id);
    } catch (_) {
      return null;
    }
  }

  static List<Incident> buildIncidents(DateTime now) {
    return [
      Incident(
        id: 'inc_001',
        reporterId: 'demo_res_sea',
        reporterName: 'Asha Mehta',
        societyId: 'sea_view',
        societyName: 'Sea View CHS',
        building: 'A',
        floor: '12',
        unit: '1204',
        category: IncidentCategory.drainage,
        description: 'Water backing up from common drain near lobby — likely shared line D-03.',
        sharedAssetId: 'asset_d03',
        sharedCaseId: 'case_001',
        status: IncidentStatus.linked,
        version: 2,
        createdAt: now.subtract(const Duration(hours: 18)),
        updatedAt: now.subtract(const Duration(hours: 10)),
        latestUpdate: 'Linked to shared case SC-2401.',
      ),
      Incident(
        id: 'inc_002',
        reporterId: 'demo_res_palm',
        reporterName: 'Rahul Kapoor',
        societyId: 'palm_heights',
        societyName: 'Palm Heights',
        building: 'B',
        floor: '8',
        unit: '803',
        category: IncidentCategory.flooding,
        description: 'Basement flooding during last rain; smell of sewage from shared drain.',
        sharedAssetId: 'asset_d03',
        sharedCaseId: 'case_001',
        status: IncidentStatus.linked,
        version: 2,
        createdAt: now.subtract(const Duration(hours: 14)),
        updatedAt: now.subtract(const Duration(hours: 10)),
        latestUpdate: 'Linked to shared case SC-2401.',
      ),
      Incident(
        id: 'inc_003',
        reporterId: 'demo_res_harbor',
        reporterName: 'Priya Nair',
        societyId: 'harbor',
        societyName: 'Harbor Residences',
        building: 'C',
        floor: '5',
        unit: '502',
        category: IncidentCategory.seepage,
        description: 'Seepage on outer wall facing the shared drainage corridor.',
        sharedAssetId: 'asset_d03',
        sharedCaseId: 'case_001',
        status: IncidentStatus.inProgress,
        version: 3,
        createdAt: now.subtract(const Duration(hours: 12)),
        updatedAt: now.subtract(const Duration(hours: 4)),
        latestUpdate: 'Worker assigned to inspect D-03.',
      ),
      Incident(
        id: 'inc_004',
        reporterId: 'demo_res_sea',
        reporterName: 'Asha Mehta',
        societyId: 'sea_view',
        societyName: 'Sea View CHS',
        building: 'A',
        floor: '3',
        unit: '302',
        category: IncidentCategory.waterlogging,
        description: 'Lobby entrance waterlogging after short rain — Block A storm drain.',
        sharedAssetId: 'asset_d01',
        status: IncidentStatus.reported,
        version: 1,
        createdAt: now.subtract(const Duration(hours: 2)),
        updatedAt: now.subtract(const Duration(hours: 2)),
        latestUpdate: 'Awaiting society review.',
      ),
    ];
  }

  static List<SharedCase> buildCases(DateTime now) {
    return [
      SharedCase(
        id: 'case_001',
        title: 'SC-2401 · Shared drainage D-03 overflow',
        sharedAssetId: 'asset_d03',
        incidentIds: const ['inc_001', 'inc_002', 'inc_003'],
        ownerOrgId: 'sea_view',
        ownerOrgName: 'Sea View CHS',
        proposedOwnerOrgId: federationOrgId,
        proposedOwnerOrgName: federationOrgName,
        status: CaseStatus.handoffPending,
        handoffStatus: HandoffStatus.proposed,
        latestUpdate: 'Handoff proposed to Coastal Federation — ownership unchanged until accepted.',
        version: 4,
        createdAt: now.subtract(const Duration(hours: 10)),
        updatedAt: now.subtract(const Duration(hours: 3)),
      ),
    ];
  }

  static List<CaseEvent> buildEvents(DateTime now) {
    return [
      CaseEvent(
        id: 'evt_001',
        caseId: 'case_001',
        type: CaseEventType.incidentsLinked,
        actorId: 'system',
        actorName: 'System',
        summary: 'Linked 3 resident reports to shared case SC-2401 for asset D-03.',
        createdAt: now.subtract(const Duration(hours: 10)),
      ),
      CaseEvent(
        id: 'evt_002',
        caseId: 'case_001',
        type: CaseEventType.workOrderCreated,
        actorId: 'system',
        actorName: 'System',
        summary: 'Work order WO-110 assigned to Vikram Drainage.',
        createdAt: now.subtract(const Duration(hours: 6)),
      ),
      CaseEvent(
        id: 'evt_003',
        caseId: 'case_001',
        type: CaseEventType.handoffProposed,
        actorId: 'mgr_sea',
        actorName: 'Sea View Manager',
        summary: 'Proposed handoff to Coastal Federation. Ownership remains with Sea View CHS until accepted.',
        createdAt: now.subtract(const Duration(hours: 3)),
      ),
      CaseEvent(
        id: 'evt_004',
        caseId: 'case_001',
        type: CaseEventType.workOrderUpdated,
        actorId: 'demo_worker',
        actorName: 'Vikram Drainage',
        summary: 'Work order marked in progress — inspecting D-03 junction.',
        createdAt: now.subtract(const Duration(hours: 2)),
      ),
    ];
  }

  static List<WorkOrder> buildWorkOrders(DateTime now) {
    return [
      WorkOrder(
        id: 'wo_001',
        caseId: 'case_001',
        incidentId: 'inc_003',
        workerId: 'demo_worker',
        workerName: 'Vikram Drainage',
        title: 'WO-110 · Inspect & clear D-03',
        description: 'Inspect shared drainage line D-03, clear blockage, capture before/after evidence.',
        assetCode: 'D-03',
        status: WorkOrderStatus.inProgress,
        version: 2,
        createdAt: now.subtract(const Duration(hours: 6)),
        updatedAt: now.subtract(const Duration(hours: 2)),
      ),
      WorkOrder(
        id: 'wo_002',
        caseId: 'case_001',
        incidentId: 'inc_001',
        workerId: 'demo_worker',
        workerName: 'Vikram Drainage',
        title: 'WO-111 · Sea View lobby drain check',
        description: 'Follow-up at Sea View lobby after D-03 clear.',
        assetCode: 'D-03',
        status: WorkOrderStatus.assigned,
        version: 1,
        createdAt: now.subtract(const Duration(hours: 5)),
        updatedAt: now.subtract(const Duration(hours: 5)),
      ),
    ];
  }
}
