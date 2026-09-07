import Foundation

/// Juegos soportados. Los nombres se usan solo de forma descriptiva (regla legal del brief).
enum Juego: String, Codable, CaseIterable, Identifiable {
    case quini6
    case brinco

    var id: String { rawValue }

    var nombre: String {
        switch self {
        case .quini6: return "Quini 6"
        case .brinco: return "Brinco"
        }
    }

    var rango: ClosedRange<Int> {
        switch self {
        case .quini6: return 0...45
        case .brinco: return 0...39
        }
    }

    /// Días de sorteo con la convención de Calendar (1 = domingo, 4 = miércoles).
    var diasSorteo: [Int] {
        switch self {
        case .quini6: return [1, 4]
        case .brinco: return [1]
        }
    }

    var horaSorteo: (hora: Int, minuto: Int) {
        switch self {
        case .quini6: return (21, 15)
        case .brinco: return (21, 0)
        }
    }

    var ordenModalidades: [String] {
        switch self {
        case .quini6: return ["tradicional", "segunda", "revancha", "siempre_sale"]
        case .brinco: return ["tradicional", "junior"]
        }
    }

    func nombreModalidad(_ clave: String) -> String {
        switch clave {
        case "tradicional": return "Tradicional"
        case "segunda": return "Segunda vuelta"
        case "revancha": return "Revancha"
        case "siempre_sale": return "Siempre sale"
        case "junior": return "Junior"
        default: return clave.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }
}

struct Sorteo: Codable, Identifiable, Equatable {
    let juego: String
    let sorteo: Int
    let fecha: String
    let modalidades: [String: Modalidad]
    let pozoExtra: PozoExtra?
    let proximo: Proximo?
    let validado: Bool
    let fuentes: [String]
    let generado: String

    var id: Int { sorteo }

    enum CodingKeys: String, CodingKey {
        case juego, sorteo, fecha, modalidades, proximo, validado, fuentes, generado
        case pozoExtra = "pozo_extra"
    }

    var juegoEnum: Juego? { Juego(rawValue: juego) }

    var fechaDate: Date? { Formato.fechaISO.date(from: fecha) }

    func modalidadesOrdenadas(_ juego: Juego) -> [(clave: String, modalidad: Modalidad)] {
        juego.ordenModalidades.compactMap { clave in
            modalidades[clave].map { (clave, $0) }
        }
    }
}

struct Modalidad: Codable, Equatable {
    let numeros: [Int]
    let premios: [PremioFila]
}

struct PremioFila: Codable, Identifiable, Equatable {
    let aciertos: Int
    let ganadores: Int
    let premio: Int
    var id: Int { aciertos }
}

struct PozoExtra: Codable, Equatable {
    let ganadores: Int
    let premio: Int
}

struct Proximo: Codable, Equatable {
    let sorteo: Int?
    let fecha: String?
    let pozo: Int?
}

struct Indice: Codable {
    let juego: String
    let sorteos: [IndiceItem]
    let generado: String
}

struct IndiceItem: Codable, Identifiable, Equatable {
    let sorteo: Int
    let fecha: String
    let validado: Bool
    var id: Int { sorteo }
}

/// Jugada guardada localmente. Nunca sale del dispositivo.
struct Jugada: Codable, Identifiable, Equatable {
    var id: UUID = UUID()
    var juego: Juego
    var numeros: [Int]
    var nombre: String
    var creada: Date = Date()
}

enum Formato {
    static let fechaISO: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "es_AR")
        f.timeZone = Config.zonaHoraria
        return f
    }()

    static let fechaLarga: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "EEEE d 'de' MMMM"
        f.locale = Locale(identifier: "es_AR")
        f.timeZone = Config.zonaHoraria
        return f
    }()

    static let fechaCorta: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "dd/MM/yyyy"
        f.locale = Locale(identifier: "es_AR")
        f.timeZone = Config.zonaHoraria
        return f
    }()

    private static let pesos: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.locale = Locale(identifier: "es_AR")
        f.maximumFractionDigits = 0
        return f
    }()

    static func pesos(_ monto: Int) -> String {
        "$ " + (pesos.string(from: NSNumber(value: monto)) ?? String(monto))
    }

    static func entero(_ n: Int) -> String {
        pesos.string(from: NSNumber(value: n)) ?? String(n)
    }

    static func fechaLarga(_ iso: String) -> String {
        guard let d = fechaISO.date(from: iso) else { return iso }
        return fechaLarga.string(from: d).capitalized
    }

    static func fechaCorta(_ iso: String) -> String {
        guard let d = fechaISO.date(from: iso) else { return iso }
        return fechaCorta.string(from: d)
    }

    /// Fecha y hora del próximo sorteo en hora Argentina, a partir de la fecha ISO publicada.
    static func fechaHoraSorteo(_ iso: String, juego: Juego) -> Date? {
        guard let dia = fechaISO.date(from: iso) else { return nil }
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = Config.zonaHoraria
        return cal.date(bySettingHour: juego.horaSorteo.hora, minute: juego.horaSorteo.minuto, second: 0, of: dia)
    }
}
