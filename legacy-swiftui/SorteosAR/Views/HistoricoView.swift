import SwiftUI

struct HistoricoView: View {
    let juego: Juego
    @EnvironmentObject private var resultados: ResultadosService

    private var items: [IndiceItem] { resultados.indices[juego] ?? [] }

    var body: some View {
        List {
            if items.isEmpty {
                ContentUnavailableCompat(texto: "Todavía no hay sorteos anteriores cargados.")
            }
            ForEach(items) { item in
                NavigationLink(value: item) {
                    HStack {
                        VStack(alignment: .leading, spacing: Espacio.xs) {
                            Text("Sorteo \(item.sorteo)")
                                .font(.body.weight(.semibold))
                            Text(Formato.fechaLarga(item.fecha))
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        if !item.validado {
                            Image(systemName: "exclamationmark.triangle")
                                .foregroundStyle(.orange)
                                .accessibilityLabel("Pendiente de confirmación")
                        }
                    }
                    .accessibilityElement(children: .combine)
                }
            }
        }
        .navigationTitle("Anteriores · \(juego.nombre)")
        .navigationDestination(for: IndiceItem.self) { item in
            SorteoCargadoView(juego: juego, numero: item.sorteo)
        }
        .refreshable { await resultados.cargarTodo() }
    }
}

extension IndiceItem: Hashable {}

/// Carga un sorteo puntual (con caché) y lo muestra.
struct SorteoCargadoView: View {
    let juego: Juego
    let numero: Int
    @EnvironmentObject private var resultados: ResultadosService
    @State private var sorteo: Sorteo?
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(spacing: Espacio.m) {
                if let s = sorteo {
                    SorteoDetalleView(juego: juego, sorteo: s)
                    DisclaimerView(compacto: true)
                } else if let e = error {
                    ContentUnavailableCompat(texto: "No se pudo cargar el sorteo \(numero). \(e)")
                } else {
                    ProgressView("Cargando sorteo \(numero)…")
                        .padding(Espacio.xl)
                }
            }
            .padding(Espacio.m)
        }
        .navigationTitle("Sorteo \(numero)")
        .task(id: numero) {
            do {
                sorteo = try await resultados.sorteo(juego, numero: numero)
            } catch {
                self.error = error.localizedDescription
            }
        }
    }
}
