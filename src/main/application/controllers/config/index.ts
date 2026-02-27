import { logger } from '@main/infrastructure/log/logger';
import { TeamMemberController } from '../team-member-controller';
import { TaskController } from '../task-controller';
import { DashboardController } from '../dashboard-controller';
import { AzureDevOpsController } from '../azure-devops-controller';
import { AutoUpdaterController } from '../auto-updater-controller';
import { AuthController } from '../auth-controller';
import { registerPositionController } from '../position-controller';
import { registerTeamController } from '../team-controller';
import { registerSprintController } from '../sprint-controller';
import { registerTeamMemberAllocationController } from '../team-member-allocation-controller';
import { TaskCommentController } from '../task-comment-controller';
import { SyncController } from '../sync-controller';

// Controllers:
// - TeamMemberController ✓
// - TaskController ✓
// - DashboardController ✓
// - AzureDevOpsController ✓
// - AutoUpdaterController ✓
// - AuthController ✓
// - PositionController ✓
// - TeamController ✓
// - SprintController ✓
// - TeamMemberAllocationController ✓
// - SyncController ✓

export function loadIpcControllers() {
  logger.info('Loading IPC controllers...');

  new TeamMemberController();
  new TaskController();
  new DashboardController();
  new AzureDevOpsController();
  new AutoUpdaterController();
  new AuthController();

  // New controllers
  registerPositionController();
  registerTeamController();
  registerSprintController();
  registerTeamMemberAllocationController();
  new TaskCommentController();
  SyncController.getInstance(); // Use singleton instance

  logger.info('All IPC controllers loaded successfully');
}

export function setSyncControllerWindow(window: any) {
  SyncController.getInstance().setMainWindow(window);
}
