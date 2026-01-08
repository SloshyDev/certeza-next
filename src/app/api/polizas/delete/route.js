import { query } from "@/lib/extractor-db";
import { NextResponse } from "next/server";

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id_poliza = searchParams.get("id");

    if (!id_poliza) {
      return NextResponse.json(
        {
          success: false,
          error: "ID de póliza requerido",
        },
        { status: 400 }
      );
    }

    // Eliminar en orden inverso debido a foreign keys

    // 1. Eliminar control_documentos
    await query(`DELETE FROM control_documentos WHERE id_poliza = $1`, [
      id_poliza,
    ]);

    // 2. Eliminar audit_log relacionado
    await query(
      `DELETE FROM audit_log WHERE tabla = 'polizas' AND id_registro = $1`,
      [id_poliza]
    );

    // 3. Obtener IDs relacionados antes de eliminar
    const polizaData = await query(
      `SELECT id_asegurado, id_vehiculo FROM polizas WHERE id_poliza = $1`,
      [id_poliza]
    );

    // 4. Eliminar póliza
    await query(`DELETE FROM polizas WHERE id_poliza = $1`, [id_poliza]);

    // 5. Opcional: Limpiar asegurado y vehículo si no tienen otras pólizas
    if (polizaData.rows.length > 0) {
      const { id_asegurado, id_vehiculo } = polizaData.rows[0];

      if (id_asegurado) {
        const countAsegurado = await query(
          `SELECT COUNT(*) as count FROM polizas WHERE id_asegurado = $1`,
          [id_asegurado]
        );
        if (parseInt(countAsegurado.rows[0].count) === 0) {
          await query(`DELETE FROM asegurados WHERE id_asegurado = $1`, [
            id_asegurado,
          ]);
        }
      }

      if (id_vehiculo) {
        const countVehiculo = await query(
          `SELECT COUNT(*) as count FROM polizas WHERE id_vehiculo = $1`,
          [id_vehiculo]
        );
        if (parseInt(countVehiculo.rows[0].count) === 0) {
          await query(`DELETE FROM vehiculos WHERE id_vehiculo = $1`, [
            id_vehiculo,
          ]);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Póliza eliminada exitosamente",
    });
  } catch (error) {
    console.error("Error al eliminar póliza:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
