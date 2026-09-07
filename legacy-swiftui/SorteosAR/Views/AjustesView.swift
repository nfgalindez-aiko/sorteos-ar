import SwiftUI

struct AjustesView: View {
    @EnvironmentObject private var jugadas: JugadasStore
    @State private var confirmarBorrado = false

    var body: some View {
        List {
            Section("Aviso") {
                DisclaimerView()
            }
            Section("Fuentes de los resultados") {
                ForEach(Config.fuentes, id: \.self) { f in
                    Text(f)
                }
                Text("Cada sorteo se publica solo cuando dos fuentes independientes coinciden número por número. Los sorteos marcados como pendientes tienen una sola fuente o una discrepancia entre fuentes.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            Section("Tus datos") {
                Text("Esta app no tiene cuenta ni recolecta datos. Las jugadas que cargás quedan guardadas únicamente en este dispositivo.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                Button(role: .destructive) {
                    confirmarBorrado = true
                } label: {
                    Label("Borrar jugadas guardadas (\(jugadas.jugadas.count))", systemImage: "trash")
                }
                .disabled(jugadas.jugadas.isEmpty)
            }
            Section("Acerca de") {
                LabeledContent("Versión", value: Config.version)
                Text("Los nombres de los juegos se usan de manera descriptiva. Esta app no está afiliada a ningún organismo ni operador de juegos de azar.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Ajustes")
        .confirmationDialog("¿Borrar todas las jugadas guardadas?", isPresented: $confirmarBorrado, titleVisibility: .visible) {
            Button("Borrar todas", role: .destructive) { jugadas.borrarTodas() }
            Button("Cancelar", role: .cancel) {}
        }
    }
}
