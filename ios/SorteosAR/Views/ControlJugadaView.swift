import SwiftUI

/// El usuario carga sus 6 números (guardados solo en el dispositivo) y la app marca
/// cuáles salieron en cada modalidad del último sorteo. Solo compara: no aconseja.
struct ControlJugadaView: View {
    let juego: Juego
    @EnvironmentObject private var resultados: ResultadosService
    @EnvironmentObject private var jugadas: JugadasStore
    @State private var mostrandoAlta = false

    private var paleta: Paleta { Paleta.para(juego) }
    private var sorteo: Sorteo? { resultados.ultimos[juego] }
    private var lista: [Jugada] { jugadas.jugadas(de: juego) }

    var body: some View {
        List {
            if let s = sorteo {
                Section {
                    Text("Comparando contra el sorteo \(s.sorteo) del \(Formato.fechaCorta(s.fecha)).")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            } else {
                Section {
                    Text("Sin sorteo cargado para comparar. Las jugadas se guardan igual.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            if lista.isEmpty {
                Section {
                    ContentUnavailableCompat(texto: "No hay jugadas guardadas. Tocá + para cargar tus 6 números.")
                }
            }
            ForEach(lista) { jugada in
                Section(jugada.nombre.isEmpty ? "Jugada" : jugada.nombre) {
                    JugadaFila(jugada: jugada, sorteo: sorteo, juego: juego)
                }
            }
            .onDelete { offsets in
                offsets.map { lista[$0] }.forEach(jugadas.borrar)
            }
            Section {
                Text("Las jugadas quedan guardadas únicamente en este dispositivo. Esta pantalla solo compara números: no recomienda ni sugiere jugadas. Ante cualquier discrepancia vale el extracto oficial.")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Controlar jugada")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    mostrandoAlta = true
                } label: {
                    Image(systemName: "plus")
                        .accessibilityLabel("Agregar jugada")
                }
            }
        }
        .sheet(isPresented: $mostrandoAlta) {
            NuevaJugadaView(juego: juego)
        }
    }
}

struct JugadaFila: View {
    let jugada: Jugada
    let sorteo: Sorteo?
    let juego: Juego

    private var paleta: Paleta { Paleta.para(juego) }

    var body: some View {
        VStack(alignment: .leading, spacing: Espacio.s) {
            FilaBolillas(titulo: "Tus números", numeros: jugada.numeros, paleta: paleta)
            if let s = sorteo {
                let aciertos = JugadasStore.aciertos(jugada, en: s)
                ForEach(s.modalidadesOrdenadas(juego), id: \.clave) { item in
                    let hits = aciertos[item.clave] ?? []
                    HStack {
                        Text(juego.nombreModalidad(item.clave))
                            .font(.subheadline)
                        Spacer()
                        Text(hits.isEmpty ? "0 aciertos" : "\(hits.count) \(hits.count == 1 ? "acierto" : "aciertos"): \(hits.map(String.init).joined(separator: ", "))")
                            .font(.subheadline.weight(hits.count >= 4 ? .bold : .regular))
                            .foregroundStyle(hits.count >= 4 ? paleta.primario : .secondary)
                    }
                    .accessibilityElement(children: .combine)
                }
            }
        }
        .padding(.vertical, Espacio.xs)
    }
}

/// Alta de jugada: grilla de números del rango del juego, se eligen exactamente 6.
struct NuevaJugadaView: View {
    let juego: Juego
    @EnvironmentObject private var jugadas: JugadasStore
    @Environment(\.dismiss) private var dismiss
    @State private var nombre = ""
    @State private var seleccion: Set<Int> = []

    private var paleta: Paleta { Paleta.para(juego) }
    private let columnas = Array(repeating: GridItem(.flexible(), spacing: Espacio.s), count: 6)

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Espacio.m) {
                    TextField("Nombre (opcional)", text: $nombre)
                        .textFieldStyle(.roundedBorder)
                    Text("Elegí 6 números del \(juego.rango.lowerBound) al \(juego.rango.upperBound). Seleccionados: \(seleccion.count) de 6.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    LazyVGrid(columns: columnas, spacing: Espacio.s) {
                        ForEach(Array(juego.rango), id: \.self) { n in
                            let activo = seleccion.contains(n)
                            Button {
                                if activo {
                                    seleccion.remove(n)
                                } else if seleccion.count < 6 {
                                    seleccion.insert(n)
                                }
                            } label: {
                                Text(String(format: "%02d", n))
                                    .font(.body.monospacedDigit().weight(.semibold))
                                    .frame(maxWidth: .infinity, minHeight: 40)
                                    .background(activo ? paleta.bolilla : Color(uiColor: .secondarySystemBackground), in: Circle())
                                    .foregroundStyle(activo ? paleta.textoBolilla : Color.primary)
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Número \(n)")
                            .accessibilityAddTraits(activo ? .isSelected : [])
                            .disabled(!activo && seleccion.count >= 6)
                        }
                    }
                    if seleccion.count == 6 {
                        FilaBolillas(titulo: "Tu jugada", numeros: seleccion.sorted(), paleta: paleta)
                    }
                }
                .padding(Espacio.m)
            }
            .navigationTitle("Nueva jugada · \(juego.nombre)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Guardar") {
                        jugadas.agregar(Jugada(juego: juego, numeros: seleccion.sorted(), nombre: nombre.trimmingCharacters(in: .whitespaces)))
                        dismiss()
                    }
                    .disabled(seleccion.count != 6)
                }
            }
        }
    }
}
