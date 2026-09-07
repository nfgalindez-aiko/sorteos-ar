import SwiftUI

/// Detalle del último sorteo de un juego, con accesos a histórico y control de jugada.
struct DetalleJuegoView: View {
    let juego: Juego
    @EnvironmentObject private var resultados: ResultadosService

    var body: some View {
        ScrollView {
            VStack(spacing: Espacio.m) {
                if resultados.sinConexion {
                    BannerSinConexion()
                }
                if let s = resultados.ultimos[juego] {
                    SorteoDetalleView(juego: juego, sorteo: s)
                } else {
                    ContentUnavailableCompat(texto: "Sin resultados disponibles todavía. Deslizá para actualizar.")
                }
                HStack(spacing: Espacio.m) {
                    NavigationLink {
                        HistoricoView(juego: juego)
                    } label: {
                        Label("Sorteos anteriores", systemImage: "clock.arrow.circlepath")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    NavigationLink {
                        ControlJugadaView(juego: juego)
                    } label: {
                        Label("Controlar jugada", systemImage: "checkmark.circle")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Paleta.para(juego).primario)
                }
                DisclaimerView(compacto: true)
            }
            .padding(Espacio.m)
        }
        .navigationTitle(juego.nombre)
        .navigationBarTitleDisplayMode(.large)
        .refreshable { await resultados.cargarTodo() }
    }
}

/// Render de un sorteo completo (lo usan el detalle del último y el histórico).
struct SorteoDetalleView: View {
    let juego: Juego
    let sorteo: Sorteo

    private var paleta: Paleta { Paleta.para(juego) }

    var body: some View {
        VStack(alignment: .leading, spacing: Espacio.m) {
            HStack {
                VStack(alignment: .leading, spacing: Espacio.xs) {
                    Text("Sorteo \(sorteo.sorteo)")
                        .font(.title3.weight(.bold))
                    Text(Formato.fechaLarga(sorteo.fecha))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if sorteo.validado {
                    Chip(texto: "Confirmado por 2 fuentes", color: paleta.primario)
                } else {
                    Chip(texto: "Pendiente de confirmación", color: .orange)
                }
            }
            .accessibilityElement(children: .combine)

            ForEach(sorteo.modalidadesOrdenadas(juego), id: \.clave) { item in
                VStack(alignment: .leading, spacing: Espacio.s) {
                    FilaBolillas(titulo: juego.nombreModalidad(item.clave), numeros: item.modalidad.numeros, paleta: paleta)
                    PremiosTabla(premios: item.modalidad.premios)
                }
                .padding(Espacio.m)
                .background(paleta.fondoTarjeta, in: RoundedRectangle(cornerRadius: Radio.tarjeta))
            }

            if let extra = sorteo.pozoExtra {
                HStack {
                    Text("Pozo extra")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(paleta.primario)
                    Spacer()
                    Text(extra.ganadores == 0 ? "Vacante" : "\(Formato.entero(extra.ganadores)) ganadores · \(Formato.pesos(extra.premio))")
                        .font(.subheadline.monospacedDigit())
                }
                .padding(Espacio.m)
                .background(paleta.fondoTarjeta, in: RoundedRectangle(cornerRadius: Radio.tarjeta))
                .accessibilityElement(children: .combine)
            }

            if let prox = sorteo.proximo, prox.fecha != nil || prox.pozo != nil {
                VStack(alignment: .leading, spacing: Espacio.xs) {
                    Text("Próximo sorteo")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(paleta.secundario)
                    if let n = prox.sorteo, let f = prox.fecha {
                        Text("Nº \(n) · \(Formato.fechaLarga(f)) · \(String(format: "%02d:%02d", juego.horaSorteo.hora, juego.horaSorteo.minuto)) hs")
                            .font(.footnote)
                    }
                    if let pozo = prox.pozo {
                        Text("Pozo estimado: \(Formato.pesos(pozo))")
                            .font(.subheadline.weight(.semibold))
                    }
                    if let f = prox.fecha, let objetivo = Formato.fechaHoraSorteo(f, juego: juego) {
                        CuentaRegresivaView(objetivo: objetivo)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(Espacio.m)
                .background(paleta.secundario.opacity(0.12), in: RoundedRectangle(cornerRadius: Radio.tarjeta))
                .accessibilityElement(children: .combine)
            }
        }
    }
}

/// Reemplazo mínimo de ContentUnavailableView (que es iOS 17+).
struct ContentUnavailableCompat: View {
    let texto: String

    var body: some View {
        VStack(spacing: Espacio.s) {
            Image(systemName: "tray")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text(texto)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(Espacio.xl)
    }
}
