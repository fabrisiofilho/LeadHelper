import { logger } from '@main/infrastructure/log/logger';
import { TeamMemberController } from '../team-member-controller';
import { TaskController } from '../task-controller';
import { AllocationController } from '../allocation-controller';
import { DashboardController } from '../dashboard-controller';
import { AzureDevOpsController } from '../azure-devops-controller';
import { AutoUpdaterController } from '../auto-updater-controller';
import { AuthController } from '../auth-controller';
import { registerPositionController } from '../position-controller';
import { registerTeamController } from '../team-controller';
import { registerSprintController } from '../sprint-controller';
import { registerTeamMemberAllocationController } from '../team-member-allocation-controller';
import { TaskStatusConfigController } from '../task-status-config-controller';

// Controllers:
// - TeamMemberController ✓
// - TaskController ✓
// - AllocationController ✓
// - DashboardController ✓
// - AzureDevOpsController ✓
// - AutoUpdaterController ✓
// - AuthController ✓
// - PositionController ✓
// - TeamController ✓
// - SprintController ✓
// - TeamMemberAllocationController ✓

export function loadIpcControllers() {
  logger.info('Loading IPC controllers...');

  new TeamMemberController();
  new TaskController();
  new AllocationController();
  new DashboardController();
  new AzureDevOpsController();
  new AutoUpdaterController();
  new AuthController();

  // New controllers
  registerPositionController();
  registerTeamController();
  registerSprintController();
  registerTeamMemberAllocationController();
  new TaskStatusConfigController();

  logger.info('All IPC controllers loaded successfully');
}
