import { describe, it, expect, vi } from "vitest";
import { ActualizarBrigadistaUseCase } from "@/core/application/use-cases/brigadistas/GestionarBrigadistas.usecase";
import { BrigadistaParroquial } from "@/core/domain/entities/brigadista/BrigadistaParroquial";
import type { IBrigadistaRepository } from "@/core/domain/repositories/IBrigadistaRepository";

describe("ActualizarBrigadistaUseCase", () => {
  it("debe actualizar un brigadista correctamente", async () => {
    const brigadista = BrigadistaParroquial.crear({
      id: "id-123",
      idParroquia: "1",
      nombres: "Juan",
      apellidos: "Perez",
      dni: "12345678",
      celular: "999",
      correo: "test@test.com",
      disponibilidad: "DISPONIBLE",
    });

    const repoMock = {
      findIdByDni: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(brigadista),
      update: vi.fn(),
    } as unknown as IBrigadistaRepository;

    const useCase = new ActualizarBrigadistaUseCase(repoMock);

    const input = {
      idParroquia: "1",
      nombres: "Juan Actualizado",
      apellidos: "Perez",
      dni: "12345678",
      celular: "999",
      correo: "test@test.com",
      disponibilidad: "DISPONIBLE",
    };

    await useCase.execute("id-123", input);

    expect(repoMock.findById).toHaveBeenCalledWith("id-123");
    expect(repoMock.update).toHaveBeenCalled();
  });
});
