import SwiftUI

/// Bolilla circular con número grande. Escala con Dynamic Type.
struct BolillaView: View {
    let numero: Int
    let paleta: Paleta
    var resaltada: Bool = false
    var tamano: CGFloat = 44

    @ScaledMetric private var escala: CGFloat = 1

    var body: some View {
        Text(String(format: "%02d", numero))
            .font(.system(.title3, design: .rounded).weight(.bold))
            .monospacedDigit()
            .minimumScaleFactor(0.6)
            .lineLimit(1)
            .foregroundStyle(paleta.textoBolilla)
            .frame(width: tamano * escala, height: tamano * escala)
            .background(Circle().fill(paleta.bolilla))
            .overlay(
                Circle().strokeBorder(resaltada ? paleta.primario : Color.clear, lineWidth: 3)
            )
            .accessibilityLabel(resaltada ? "Número \(numero), acertado" : "Número \(numero)")
    }
}

/// Fila de 6 bolillas. VoiceOver la lee como un solo elemento: "Tradicional: 2, 16, 20, 21, 22, 38".
struct FilaBolillas: View {
    let titulo: String
    let numeros: [Int]
    let paleta: Paleta
    var resaltados: Set<Int> = []

    var body: some View {
        VStack(alignment: .leading, spacing: Espacio.s) {
            Text(titulo)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(paleta.primario)
            ViewThatFits(in: .horizontal) {
                HStack(spacing: Espacio.s) { bolillas }
                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: Espacio.s) { bolillas }
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(titulo): " + numeros.map(String.init).joined(separator: ", "))
    }

    private var bolillas: some View {
        ForEach(numeros, id: \.self) { n in
            BolillaView(numero: n, paleta: paleta, resaltada: resaltados.contains(n))
        }
    }
}

/// Tabla de premios de una modalidad.
struct PremiosTabla: View {
    let premios: [PremioFila]

    var body: some View {
        VStack(spacing: Espacio.xs) {
            HStack {
                Text("Aciertos").frame(maxWidth: .infinity, alignment: .leading)
                Text("Ganadores").frame(maxWidth: .infinity, alignment: .trailing)
                Text("Premio").frame(maxWidth: .infinity, alignment: .trailing)
            }
            .font(.caption.weight(.semibold))
            .foregroundStyle(.secondary)
            ForEach(premios) { fila in
                HStack {
                    Text("\(fila.aciertos)").frame(maxWidth: .infinity, alignment: .leading)
                    Text(fila.ganadores == 0 ? "Vacante" : Formato.entero(fila.ganadores))
                        .frame(maxWidth: .infinity, alignment: .trailing)
                    Text(Formato.pesos(fila.premio))
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
                .font(.subheadline.monospacedDigit())
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("\(fila.aciertos) aciertos, \(fila.ganadores == 0 ? "vacante" : "\(fila.ganadores) ganadores"), premio \(Formato.pesos(fila.premio))")
            }
        }
    }
}

/// Cuenta regresiva al próximo sorteo. Se actualiza cada segundo.
struct CuentaRegresivaView: View {
    let objetivo: Date

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { ctx in
            let restante = objetivo.timeIntervalSince(ctx.date)
            if restante <= 0 {
                Label("Sorteo en curso o pendiente de publicación", systemImage: "clock")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            } else {
                let s = Int(restante)
                let d = s / 86400, h = (s % 86400) / 3600, m = (s % 3600) / 60, seg = s % 60
                Text(d > 0 ? "Faltan \(d) d \(h) h \(m) min" : String(format: "Faltan %02d:%02d:%02d", h, m, seg))
                    .font(.footnote.monospacedDigit())
                    .foregroundStyle(.secondary)
                    .accessibilityLabel(d > 0 ? "Faltan \(d) días, \(h) horas y \(m) minutos" : "Faltan \(h) horas, \(m) minutos y \(seg) segundos")
            }
        }
    }
}

struct BannerSinConexion: View {
    var body: some View {
        Label("Sin conexión. Mostrando los últimos resultados guardados.", systemImage: "wifi.slash")
            .font(.footnote)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(Espacio.m)
            .background(Color.orange.opacity(0.15), in: RoundedRectangle(cornerRadius: Radio.chip))
            .accessibilityAddTraits(.isStaticText)
    }
}

struct DisclaimerView: View {
    var compacto = false

    var body: some View {
        Text(Config.disclaimer)
            .font(compacto ? .caption2 : .footnote)
            .foregroundStyle(.secondary)
            .multilineTextAlignment(.leading)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct Chip: View {
    let texto: String
    let color: Color

    var body: some View {
        Text(texto)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, Espacio.s)
            .padding(.vertical, Espacio.xs)
            .background(color.opacity(0.18), in: Capsule())
            .foregroundStyle(color)
    }
}
