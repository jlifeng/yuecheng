import { Injectable, NotFoundException } from '@nestjs/common'
import { DemandStatus } from './domain/demand-status'
import { DemandType } from './domain/demand-type'

export interface DemandRecord extends Record<string, unknown> {
  id: string
  type: DemandType
  status: DemandStatus
}

export interface CreateDemandInput {
  type: DemandType
  passengerName?: string
}

@Injectable()
export class DemandService {
  private readonly demands = new Map<string, DemandRecord>()

  private sequence = 0

  createDemand(input: CreateDemandInput): DemandRecord {
    const demand: DemandRecord = {
      id: this.nextId(),
      ...input,
      status: DemandStatus.PENDING_BID,
    }

    this.demands.set(demand.id, demand)
    return this.cloneDemand(demand)
  }

  getDemand(id: string): DemandRecord | undefined {
    const demand = this.demands.get(id)
    return demand === undefined ? undefined : this.cloneDemand(demand)
  }

  listDemands(): DemandRecord[] {
    return [...this.demands.values()].map((demand) => this.cloneDemand(demand))
  }

  closeDemand(id: string): DemandRecord {
    return this.updateStatus(id, DemandStatus.CLOSED)
  }

  markOrderCreated(id: string): DemandRecord {
    return this.updateStatus(id, DemandStatus.ORDER_CREATED)
  }

  private updateStatus(id: string, status: DemandStatus): DemandRecord {
    const demand = this.assertDemandExists(id)
    const updatedDemand: DemandRecord = {
      ...demand,
      status,
    }

    this.demands.set(id, updatedDemand)
    return this.cloneDemand(updatedDemand)
  }

  private assertDemandExists(id: string): DemandRecord {
    const demand = this.demands.get(id)

    if (demand === undefined) {
      throw new NotFoundException('DEMAND_NOT_FOUND')
    }

    return demand
  }

  private nextId(): string {
    this.sequence += 1
    return `demand-${this.sequence}`
  }

  private cloneDemand(demand: DemandRecord): DemandRecord {
    return { ...demand }
  }
}
