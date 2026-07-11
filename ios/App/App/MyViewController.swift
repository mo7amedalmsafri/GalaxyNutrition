import UIKit
import Capacitor

// متحكم الجسر المخصص — يسجّل إضافات التطبيق المحلية عند الإقلاع
class MyViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WaterWidgetPlugin())
        bridge?.registerPluginInstance(HealthPlugin())
    }
}
