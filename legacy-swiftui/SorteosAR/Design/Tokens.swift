import SwiftUI
import UIKit

/// Tokens de diseño. Paleta INSPIRADA en la familia cromática de cada juego, nunca copia.
/// Tipografía: sistema (SF Pro). Sin logos ajenos.
enum Espacio {
    static let xs: CGFloat = 4
    static let s: CGFloat = 8
    static let m: CGFloat = 16
    static let l: CGFloat = 24
    static let xl: CGFloat = 32
}

enum Radio {
    static let tarjeta: CGFloat = 16
    static let chip: CGFloat = 10
}

struct Paleta {
    let primario: Color      // acento principal (títulos, bordes)
    let secundario: Color    // acento de apoyo (chips, próximos)
    let bolilla: Color       // relleno de las bolillas
    let textoBolilla: Color  // número dentro de la bolilla
    let fondoTarjeta: Color

    /// Color adaptativo claro/oscuro.
    private static func dyn(_ claro: UIColor, _ oscuro: UIColor) -> Color {
        Color(uiColor: UIColor { $0.userInterfaceStyle == .dark ? oscuro : claro })
    }

    static let quini6 = Paleta(
        primario: dyn(UIColor(red: 0.05, green: 0.45, blue: 0.27, alpha: 1), UIColor(red: 0.35, green: 0.80, blue: 0.55, alpha: 1)),
        secundario: dyn(UIColor(red: 0.85, green: 0.65, blue: 0.05, alpha: 1), UIColor(red: 0.98, green: 0.80, blue: 0.25, alpha: 1)),
        bolilla: dyn(UIColor(red: 0.97, green: 0.84, blue: 0.25, alpha: 1), UIColor(red: 0.90, green: 0.75, blue: 0.20, alpha: 1)),
        textoBolilla: dyn(UIColor(red: 0.10, green: 0.20, blue: 0.12, alpha: 1), UIColor(red: 0.08, green: 0.14, blue: 0.10, alpha: 1)),
        fondoTarjeta: dyn(UIColor(red: 0.92, green: 0.97, blue: 0.93, alpha: 1), UIColor(red: 0.10, green: 0.18, blue: 0.13, alpha: 1))
    )

    static let brinco = Paleta(
        primario: dyn(UIColor(red: 0.12, green: 0.32, blue: 0.62, alpha: 1), UIColor(red: 0.50, green: 0.70, blue: 0.98, alpha: 1)),
        secundario: dyn(UIColor(red: 0.90, green: 0.40, blue: 0.10, alpha: 1), UIColor(red: 1.00, green: 0.60, blue: 0.30, alpha: 1)),
        bolilla: dyn(UIColor(red: 0.98, green: 0.55, blue: 0.20, alpha: 1), UIColor(red: 0.95, green: 0.55, blue: 0.22, alpha: 1)),
        textoBolilla: dyn(UIColor.white, UIColor(red: 0.10, green: 0.08, blue: 0.05, alpha: 1)),
        fondoTarjeta: dyn(UIColor(red: 0.92, green: 0.95, blue: 0.99, alpha: 1), UIColor(red: 0.09, green: 0.14, blue: 0.22, alpha: 1))
    )

    static func para(_ juego: Juego) -> Paleta {
        switch juego {
        case .quini6: return .quini6
        case .brinco: return .brinco
        }
    }
}
