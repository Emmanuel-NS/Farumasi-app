import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';
import { OrderStatus, Role } from '@prisma/client';

// Valid state transitions — enforced server-side
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_REVIEW: [OrderStatus.FINDING_PHARMACY, OrderStatus.CANCELLED],
  FINDING_PHARMACY: [OrderStatus.PHARMACY_ACCEPTED, OrderStatus.CANCELLED],
  PHARMACY_ACCEPTED: [OrderStatus.PAYMENT_PENDING, OrderStatus.CANCELLED],
  PAYMENT_PENDING: [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
  READY_FOR_PICKUP: [OrderStatus.RIDER_ASSIGNED, OrderStatus.CANCELLED],
  RIDER_ASSIGNED: [OrderStatus.OUT_FOR_DELIVERY],
  OUT_FOR_DELIVERY: [OrderStatus.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    patientId: string,
    dto: CreateOrderDto,
  ) {
    // Validate patient exists
    const patient = await this.prisma.patient.findFirst({
      where: { userId: patientId },
    });
    if (!patient) throw new NotFoundException('Patient profile not found');

    const order = await this.prisma.order.create({
      data: {
        patientId: patient.id,
        prescriptionId: dto.prescriptionId,
        pharmacyId: dto.pharmacyId,
        deliveryAddress: dto.deliveryAddress,
        deliveryLatitude: dto.deliveryLatitude,
        deliveryLongitude: dto.deliveryLongitude,
        status: OrderStatus.PENDING_REVIEW,
        items: dto.items
          ? {
              create: dto.items.map((item) => ({
                medicineId: item.medicineId,
                medicineName: item.medicineName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              })),
            }
          : undefined,
      },
      include: { items: true, prescription: true },
    });

    return order;
  }

  async findForUser(userId: string, role: Role) {
    if (role === Role.PATIENT) {
      const patient = await this.prisma.patient.findFirst({
        where: { userId },
      });
      if (!patient) return [];
      return this.prisma.order.findMany({
        where: { patientId: patient.id },
        include: { items: true, pharmacy: true, rider: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (role === Role.PHARMACIST || role === Role.PHARMACY_ADMIN) {
      const pharmacist = await this.prisma.pharmacist.findFirst({
        where: { userId },
      });
      if (!pharmacist) return [];
      return this.prisma.order.findMany({
        where: { pharmacyId: pharmacist.pharmacyId },
        include: {
          items: true,
          patient: { include: { user: true } },
          prescription: true,
          rider: { include: { user: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (role === Role.RIDER) {
      const rider = await this.prisma.rider.findFirst({ where: { userId } });
      if (!rider) return [];
      return this.prisma.order.findMany({
        where: { riderId: rider.id },
        include: {
          items: true,
          patient: { include: { user: true } },
          pharmacy: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Super admin — all orders
    return this.prisma.order.findMany({
      include: {
        items: true,
        patient: { include: { user: true } },
        pharmacy: true,
        rider: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { medicine: true } },
        patient: { include: { user: true } },
        pharmacy: true,
        rider: { include: { user: true } },
        prescription: { include: { items: true } },
        delivery: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    actorUserId: string,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const allowed = ALLOWED_TRANSITIONS[order.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition order from ${order.status} to ${dto.status}`,
      );
    }

    const now = new Date();
    const updateData: any = { status: dto.status };

    if (dto.pharmacyId) updateData.pharmacyId = dto.pharmacyId;
    if (dto.pharmacyPrice !== undefined) {
      updateData.pharmacyPrice = dto.pharmacyPrice;
      updateData.acceptedAt = now;
    }
    if (dto.deliveryFee !== undefined) updateData.deliveryFee = dto.deliveryFee;
    if (dto.riderId) updateData.riderId = dto.riderId;
    if (dto.paymentId) {
      updateData.paymentId = dto.paymentId;
      updateData.paidAt = now;
    }
    if (dto.status === OrderStatus.DELIVERED) {
      updateData.deliveredAt = now;
    }

    // Auto-calculate total
    if (dto.pharmacyPrice !== undefined || dto.deliveryFee !== undefined) {
      updateData.totalPrice =
        (dto.pharmacyPrice ?? order.pharmacyPrice) +
        (dto.deliveryFee ?? order.deliveryFee);
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: { items: true, pharmacy: true, rider: true },
    });
  }
}
