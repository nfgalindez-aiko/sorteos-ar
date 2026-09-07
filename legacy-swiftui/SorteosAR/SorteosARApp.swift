import SwiftUI

@main
struct SorteosARApp: App {
    @StateObject private var resultados = ResultadosService()
    @StateObject private var jugadas = JugadasStore()

    var body: some Scene {
        WindowGroup {
            InicioView()
                .environmentObject(resultados)
                .environmentObject(jugadas)
                .task { await resultados.cargarTodo() }
        }
    }
}

/// Configuración fija de la app. La app NO scrapea: consume el JSON que publica el backend.
enum Config {
    /// URL base de GitHub Pages del repo del backend (nfgalindez-aiko/sorteos-ar).
    /// Debe terminar en "/data/".
    static let baseURL = URL(string: "https://nfgalindez-aiko.github.io/sorteos-ar/data/")!
    static let version = (Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String) ?? "0.1.0"
    static let disclaimer = "Aplicación informativa independiente. No está afiliada a Lotería de Santa Fe ni a ningún organismo oficial. No permite apostar. Ante cualquier discrepancia vale el extracto oficial. Jugar compulsivamente es perjudicial para la salud. +18."
    static let fuentes = ["tujugada.com.ar", "quini-6-resultados.com.ar"]
    static let zonaHoraria = TimeZone(identifier: "America/Argentina/Buenos_Aires")!
}
