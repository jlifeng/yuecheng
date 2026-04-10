import { BadRequestException, NotFoundException, ValidationPipe } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { DemandStatus } from '../src/modules/demand/domain/demand-status'
import { DemandType } from '../src/modules/demand/domain/demand-type'
import { CreateDemandDto } from '../src/modules/demand/dto/create-demand.dto'
import { DemandController } from '../src/modules/demand/demand.controller'
import { DemandService } from '../src/modules/demand/demand.service'

describe('Demand domain', () => {
  it('should expose the three supported demand types', () => {
    expect(Object.values(DemandType)).toEqual(['TRANSFER', 'CHARTER_DAY', 'MULTI_DAY'])
  })

  it('should expose the demand status lifecycle for task 3', () => {
    expect(Object.values(DemandStatus)).toEqual(['PENDING_BID', 'ORDER_CREATED', 'CLOSED'])
  })
})

describe('DemandService', () => {
  it('should create a demand in pending bid status by default', () => {
    const service = new DemandService()

    const demand = service.createDemand({
      type: DemandType.TRANSFER,
      passengerName: '张三',
    })

    expect(demand).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        type: DemandType.TRANSFER,
        status: DemandStatus.PENDING_BID,
        passengerName: '张三',
      }),
    )
    expect(service.getDemand(demand.id)).toEqual(demand)
  })

  it('should close an existing demand', () => {
    const service = new DemandService()
    const demand = service.createDemand({
      type: DemandType.CHARTER_DAY,
    })

    const closedDemand = service.closeDemand(demand.id)

    expect(closedDemand.status).toBe(DemandStatus.CLOSED)
    expect(service.getDemand(demand.id)?.status).toBe(DemandStatus.CLOSED)
  })

  it('should return copies instead of internal demand references', () => {
    const service = new DemandService()
    const demand = service.createDemand({
      type: DemandType.MULTI_DAY,
    })

    const fetchedDemand = service.getDemand(demand.id)
    expect(fetchedDemand).toEqual(demand)

    if (fetchedDemand === undefined) {
      throw new Error('Expected demand to exist')
    }

    fetchedDemand.status = DemandStatus.CLOSED
    expect(service.getDemand(demand.id)?.status).toBe(DemandStatus.PENDING_BID)
  })

  it('should reject missing demands when closing', () => {
    const service = new DemandService()

    expect(() => service.closeDemand('missing-demand')).toThrow(NotFoundException)
  })
})

describe('DemandController validation boundary', () => {
  it('should reject invalid demand types before the controller method runs', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true })
    const controller = new DemandController(new DemandService())

    await expect(
      pipe.transform(
        {
          type: 'INVALID',
          passengerName: '张三',
        },
        {
          type: 'body',
          metatype: CreateDemandDto,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException)

    expect(controller).toBeInstanceOf(DemandController)
  })
})
