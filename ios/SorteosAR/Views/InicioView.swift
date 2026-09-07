import SwiftUI

struct InicioView: View {
    @EnvironmentObject private var resultados: ResultadosService

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Espacio.m) {
                    if resultados.sinConexion {
                        BannerSinConexion()
                    }
                    ForEach(Juego.allCases) { juego in
                        NavigationLink(value: juego) {
                            TarjetaJuegoView(juego: juego, sorteo: resultados.ultimos[juego])
                        }
                        .buttonStyle(.plain)
                        .accessibilityHint("Abre el detalle de \(juego.nombre)")
                    }
                    if let fecha = resultados.ultimaActualizacion {
                        Text("Actualizado \(fecha.formatted(date: .omitted, time: .shortened))")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                    DisclaimerView()
                        .padding(.top, Espacio.s)
                }
                .padding(Espacio.m)
            }
            .navigationTitle("Sorteos AR")
            .navigationDestination(for: Juego.self) { juego in
                DetalleJuegoView(juego: juego)
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink {
                        AjustesView()
                    } label: {
                        Image(systemName: "gearshape")
                            .accessibilityLabel("Ajustes")
                    }
                }
            }
            .refreshable { await resultados.cargarTodo() }
        }
    }
}

struct TarjetaJuegoView: View {
    let juego: Juego
    let sorteo: Sorteo?

    private var paleta: Paleta { Paleta.para(juego) }

    var body: some View {
        VStack(alignment: .leading, spacing: Espacio.s) {
            HStack {
                Text(juego.nombre)
                    .font(.title2.weight(.bold))
                    .foregroundStyle(paleta.primario)
                Spacer()
                if let s = sorteo {
                    Chip(texto: "Sorteo \(s.sorteo)", color: paleta.primario)
                }
            }
            if let s = sorteo {
                Text(Formato.fechaLarga(s.fecha))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                if let trad = s.modalidades["tradicional"] {
                    FilaBolillas(titulo: juego.nombreModalidad("tradicional"), numeros: trad.numeros, paleta: paleta)
                }
                Divider()
                if let prox = s.proximo {
                    VStack(alignment: .leading, spacing: Espacio.xs) {
                        if let pozo = prox.pozo {
                            Text("Próximo pozo estimado: \(Formato.pesos(pozo))")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(paleta.secundario)
                        }
                        if let f = prox.fecha, let objetivo = Formato.fechaHoraSorteo(f, juego: juego) {
                            Text("Próximo sorteo: \(Formato.fechaLarga(f)) \(String(format: "%02d:%02d", juego.horaSorteo.hora, juego.horaSorteo.minuto)) hs")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                            CuentaRegresivaView(objetivo: objetivo)
                        }
                    }
                }
                if !s.validado {
                    Chip(texto: "Pendiente de confirmación", color: .orange)
                }
            } else {
                Text("Todavía no hay resultados cargados.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(Espacio.m)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(paleta.fondoTarjeta, in: RoundedRectangle(cornerRadius: Radio.tarjeta))
        .overlay(RoundedRectangle(cornerRadius: Radio.tarjeta).strokeBorder(paleta.primario.opacity(0.25)))
    }
}
