import Foundation

/// Jugadas del usuario, guardadas en Documents/jugadas.json. Sin cuenta, sin servidor.
/// Solo compara números contra los sorteados: no aconseja ni sugiere.
@MainActor
final class JugadasStore: ObservableObject {
    @Published private(set) var jugadas: [Jugada] = []

    private let archivo: URL
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init(archivo: URL? = nil) {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        self.archivo = archivo ?? docs.appendingPathComponent("jugadas.json")
        encoder.dateEncodingStrategy = .iso8601
        decoder.dateDecodingStrategy = .iso8601
        cargar()
    }

    func jugadas(de juego: Juego) -> [Jugada] {
        jugadas.filter { $0.juego == juego }
    }

    func agregar(_ jugada: Jugada) {
        jugadas.append(jugada)
        guardar()
    }

    func borrar(_ jugada: Jugada) {
        jugadas.removeAll { $0.id == jugada.id }
        guardar()
    }

    func borrarTodas() {
        jugadas.removeAll()
        guardar()
    }

    /// Números de la jugada que salieron en cada modalidad del sorteo.
    static func aciertos(_ jugada: Jugada, en sorteo: Sorteo) -> [String: [Int]] {
        var out: [String: [Int]] = [:]
        for (clave, modalidad) in sorteo.modalidades {
            out[clave] = jugada.numeros.filter { modalidad.numeros.contains($0) }.sorted()
        }
        return out
    }

    // MARK: - Persistencia

    private func cargar() {
        guard let data = try? Data(contentsOf: archivo),
              let lista = try? decoder.decode([Jugada].self, from: data) else { return }
        jugadas = lista
    }

    private func guardar() {
        guard let data = try? encoder.encode(jugadas) else { return }
        try? data.write(to: archivo, options: [.atomic, .completeFileProtection])
    }
}
