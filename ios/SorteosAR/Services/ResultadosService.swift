import Foundation

/// Cliente del JSON estático publicado por el backend, con caché en disco y modo offline.
/// - Cada respuesta válida se guarda en Caches/ y se reutiliza si la red falla.
/// - `sinConexion` se enciende cuando hubo que recurrir a la caché.
@MainActor
final class ResultadosService: ObservableObject {
    @Published private(set) var ultimos: [Juego: Sorteo] = [:]
    @Published private(set) var indices: [Juego: [IndiceItem]] = [:]
    @Published private(set) var sinConexion = false
    @Published private(set) var cargando = false
    @Published private(set) var ultimaActualizacion: Date?
    @Published private(set) var errorTexto: String?

    private let session: URLSession
    private let decoder = JSONDecoder()
    private let cacheDir: URL

    init(session: URLSession? = nil) {
        if let session {
            self.session = session
        } else {
            let cfg = URLSessionConfiguration.default
            cfg.timeoutIntervalForRequest = 15
            cfg.requestCachePolicy = .reloadIgnoringLocalCacheData
            self.session = URLSession(configuration: cfg)
        }
        let base = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
        cacheDir = base.appendingPathComponent("sorteos-json", isDirectory: true)
        try? FileManager.default.createDirectory(at: cacheDir, withIntermediateDirectories: true)
        // Arranque instantáneo con lo último cacheado, aunque no haya red.
        for juego in Juego.allCases {
            if let s: Sorteo = leerCache("\(juego.rawValue)/latest.json") { ultimos[juego] = s }
            if let i: Indice = leerCache("\(juego.rawValue)/index.json") { indices[juego] = i.sorteos }
        }
    }

    // MARK: - API pública

    func cargarTodo() async {
        cargando = true
        defer { cargando = false }
        var fallos = 0
        for juego in Juego.allCases {
            do {
                let s: Sorteo = try await descargar("\(juego.rawValue)/latest.json")
                ultimos[juego] = s
            } catch {
                fallos += 1
            }
            if let i: Indice = try? await descargar("\(juego.rawValue)/index.json") {
                indices[juego] = i.sorteos
            }
        }
        sinConexion = fallos == Juego.allCases.count
        if !sinConexion { ultimaActualizacion = Date() }
    }

    /// Un sorteo puntual del histórico. Los sorteos ya publicados no cambian, así que la caché vale siempre.
    func sorteo(_ juego: Juego, numero: Int) async throws -> Sorteo {
        let path = "\(juego.rawValue)/\(numero).json"
        if let s: Sorteo = leerCache(path) { return s }
        return try await descargar(path)
    }

    // MARK: - Red y caché

    private func descargar<T: Decodable>(_ path: String) async throws -> T {
        let url = Config.baseURL.appendingPathComponent(path)
        do {
            let (data, resp) = try await session.data(from: url)
            guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                throw URLError(.badServerResponse)
            }
            let valor = try decoder.decode(T.self, from: data)
            escribirCache(path, data: data)
            errorTexto = nil
            return valor
        } catch {
            errorTexto = error.localizedDescription
            if let cacheado: T = leerCache(path) {
                sinConexion = true
                return cacheado
            }
            throw error
        }
    }

    private func archivoCache(_ path: String) -> URL {
        cacheDir.appendingPathComponent(path.replacingOccurrences(of: "/", with: "_"))
    }

    private func leerCache<T: Decodable>(_ path: String) -> T? {
        guard let data = try? Data(contentsOf: archivoCache(path)) else { return nil }
        return try? decoder.decode(T.self, from: data)
    }

    private func escribirCache(_ path: String, data: Data) {
        try? data.write(to: archivoCache(path), options: .atomic)
    }
}
