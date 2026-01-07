import { Injectable } from '@nestjs/common';
import { DashboardService } from '../dashboard/dashboard.service';

@Injectable()
export class UserService {
  constructor(private dashboardService: DashboardService) {}

  async getDashboardData(userId: string, monthKey: string) {
    return this.dashboardService.getDashboardData(userId, monthKey);
  }

  async getOrderTrends(userId: string, range: number) {
    return this.dashboardService.getOrderTrends(userId, range);
  }

  async getWarnings(userId: string) {
    return this.dashboardService.getWarnings(userId);
  }

  async markWarningAsRead(userId: string, warningId: string) {
    return this.dashboardService.markWarningAsRead(userId, warningId);
  }
}

