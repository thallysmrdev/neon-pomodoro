using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Windows.Media.Control;

namespace NativeBridge
{
    class Program
    {
        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll")]
        private static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

        private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        private const uint WM_APPCOMMAND = 0x0319;
        private const int APPCOMMAND_MEDIA_NEXTTRACK = 11;
        private const int APPCOMMAND_MEDIA_PREVTRACK = 12;
        private const int APPCOMMAND_MEDIA_STOP = 13;
        private const int APPCOMMAND_MEDIA_PLAY_PAUSE = 14;
        private const int APPCOMMAND_MEDIA_PLAY = 46;
        private const int APPCOMMAND_MEDIA_PAUSE = 47;

        private static GlobalSystemMediaTransportControlsSessionManager? _sessionManager;
        private static string _lastJson = "";
        private static readonly object _lock = new();

        static async Task Main(string[] args)
        {
            Console.OutputEncoding = Encoding.UTF8;
            Console.InputEncoding = Encoding.UTF8;

            try
            {
                _sessionManager = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
                if (_sessionManager != null)
                {
                    _sessionManager.CurrentSessionChanged += (s, e) => { EmitStatus(); };
                    _sessionManager.SessionsChanged += (s, e) => { EmitStatus(); };
                }
            }
            catch { }

            // Stdin background reader thread
            var inputThread = new Thread(() =>
            {
                while (true)
                {
                    try
                    {
                        string? line = Console.ReadLine();
                        if (line == null || line.Trim().Equals("exit", StringComparison.OrdinalIgnoreCase))
                        {
                            Environment.Exit(0);
                            break;
                        }

                        HandleCommand(line.Trim().ToLowerInvariant());
                    }
                    catch
                    {
                        break;
                    }
                }
            })
            {
                IsBackground = true
            };
            inputThread.Start();

            // Main loop: polls status and outputs updates specifically for Spotify
            while (true)
            {
                EmitStatus();
                Thread.Sleep(900);
            }
        }

        private static bool IsSpotifySession(GlobalSystemMediaTransportControlsSession? s)
        {
            if (s == null) return false;
            string id = s.SourceAppUserModelId ?? "";
            return id.Contains("Spotify", StringComparison.OrdinalIgnoreCase);
        }

        private static GlobalSystemMediaTransportControlsSession? GetSpotifySession()
        {
            if (_sessionManager == null) return null;
            try
            {
                var sessions = _sessionManager.GetSessions();
                if (sessions != null && sessions.Count > 0)
                {
                    GlobalSystemMediaTransportControlsSession? pausedSpotify = null;
                    foreach (var s in sessions)
                    {
                        if (IsSpotifySession(s))
                        {
                            var playback = s.GetPlaybackInfo();
                            if (playback?.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing)
                            {
                                return s;
                            }
                            pausedSpotify ??= s;
                        }
                    }

                    if (pausedSpotify != null)
                    {
                        return pausedSpotify;
                    }
                }

                var current = _sessionManager.GetCurrentSession();
                if (current != null && IsSpotifySession(current))
                {
                    return current;
                }
            }
            catch { }
            return null;
        }

        private static void SendCommandToSpotifyWindow(int appCommand)
        {
            try
            {
                var procs = Process.GetProcessesByName("spotify");
                if (procs.Length == 0) return;

                var pids = new HashSet<uint>();
                foreach (var p in procs) pids.Add((uint)p.Id);

                EnumWindows((hWnd, lParam) =>
                {
                    GetWindowThreadProcessId(hWnd, out uint pid);
                    if (pids.Contains(pid))
                    {
                        var sb = new StringBuilder(512);
                        GetWindowText(hWnd, sb, 512);
                        string t = sb.ToString().Trim();

                        if (!string.IsNullOrEmpty(t) && t != "AngleHiddenWindow" && t != "Default IME" && t != "MSCTFIME UI")
                        {
                            // Send APPCOMMAND explicitly and exclusively to Spotify's HWND
                            SendMessage(hWnd, WM_APPCOMMAND, hWnd, (IntPtr)(appCommand << 16));
                            return false; // Done
                        }
                    }
                    return true;
                }, IntPtr.Zero);
            }
            catch { }
        }

        private static async void HandleCommand(string cmd)
        {
            try
            {
                var session = GetSpotifySession();

                if (cmd == "play-pause" || cmd == "toggle")
                {
                    if (session != null)
                    {
                        try { await session.TryTogglePlayPauseAsync(); }
                        catch { SendCommandToSpotifyWindow(APPCOMMAND_MEDIA_PLAY_PAUSE); }
                    }
                    else
                    {
                        SendCommandToSpotifyWindow(APPCOMMAND_MEDIA_PLAY_PAUSE);
                    }
                }
                else if (cmd == "play")
                {
                    if (session != null)
                    {
                        try { await session.TryPlayAsync(); }
                        catch { SendCommandToSpotifyWindow(APPCOMMAND_MEDIA_PLAY); }
                    }
                    else
                    {
                        SendCommandToSpotifyWindow(APPCOMMAND_MEDIA_PLAY);
                    }
                }
                else if (cmd == "pause")
                {
                    if (session != null)
                    {
                        try { await session.TryPauseAsync(); }
                        catch { SendCommandToSpotifyWindow(APPCOMMAND_MEDIA_PAUSE); }
                    }
                    else
                    {
                        SendCommandToSpotifyWindow(APPCOMMAND_MEDIA_PAUSE);
                    }
                }
                else if (cmd == "next")
                {
                    if (session != null)
                    {
                        try { await session.TrySkipNextAsync(); }
                        catch { SendCommandToSpotifyWindow(APPCOMMAND_MEDIA_NEXTTRACK); }
                    }
                    else
                    {
                        SendCommandToSpotifyWindow(APPCOMMAND_MEDIA_NEXTTRACK);
                    }
                }
                else if (cmd == "prev")
                {
                    if (session != null)
                    {
                        try { await session.TrySkipPreviousAsync(); }
                        catch { SendCommandToSpotifyWindow(APPCOMMAND_MEDIA_PREVTRACK); }
                    }
                    else
                    {
                        SendCommandToSpotifyWindow(APPCOMMAND_MEDIA_PREVTRACK);
                    }
                }
                else if (cmd == "status")
                {
                    EmitStatus(force: true);
                }

                Thread.Sleep(150);
                EmitStatus();
            }
            catch { }
        }

        private static void EmitStatus(bool force = false)
        {
            lock (_lock)
            {
                var payload = GetCurrentMediaPayload().GetAwaiter().GetResult();
                string json = JsonSerializer.Serialize(payload);

                if (force || json != _lastJson)
                {
                    _lastJson = json;
                    Console.WriteLine("MEDIA_UPDATE:" + json);
                }
            }
        }

        private static async Task<Dictionary<string, object>> GetCurrentMediaPayload()
        {
            // 1. Try Windows SMTC for Spotify specifically (NEVER capture Chrome, Edge or YouTube)
            try
            {
                var spotifySession = GetSpotifySession();
                if (spotifySession != null)
                {
                    var mediaProps = await spotifySession.TryGetMediaPropertiesAsync();
                    var playbackInfo = spotifySession.GetPlaybackInfo();

                    if (mediaProps != null && !string.IsNullOrWhiteSpace(mediaProps.Title))
                    {
                        string status = playbackInfo?.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing
                            ? "playing"
                            : "paused";

                        return new Dictionary<string, object>
                        {
                            ["running"] = true,
                            ["status"] = status,
                            ["title"] = mediaProps.Title,
                            ["artist"] = mediaProps.Artist ?? "",
                            ["album"] = mediaProps.AlbumTitle ?? "",
                            ["source"] = "Spotify"
                        };
                    }
                }
            }
            catch { }

            // 2. Fallback to Spotify Process Window Title
            var spotifyProcesses = Process.GetProcessesByName("spotify");
            if (spotifyProcesses.Length == 0)
            {
                return new Dictionary<string, object>
                {
                    ["running"] = false,
                    ["status"] = "not_running",
                    ["title"] = "",
                    ["artist"] = "",
                    ["album"] = "",
                    ["source"] = "Spotify"
                };
            }

            string? spotTitle = GetSpotifyWindowTitle(spotifyProcesses);

            if (!string.IsNullOrEmpty(spotTitle) && spotTitle.Contains(" - "))
            {
                int sep = spotTitle.IndexOf(" - ", StringComparison.Ordinal);
                string artist = spotTitle.Substring(0, sep).Trim();
                string title = spotTitle.Substring(sep + 3).Trim();

                return new Dictionary<string, object>
                {
                    ["running"] = true,
                    ["status"] = "playing",
                    ["title"] = title,
                    ["artist"] = artist,
                    ["album"] = "",
                    ["source"] = "Spotify"
                };
            }

            if (!string.IsNullOrEmpty(spotTitle))
            {
                return new Dictionary<string, object>
                {
                    ["running"] = true,
                    ["status"] = "paused",
                    ["title"] = "",
                    ["artist"] = "",
                    ["album"] = "",
                    ["source"] = "Spotify"
                };
            }

            return new Dictionary<string, object>
            {
                ["running"] = true,
                ["status"] = "idle",
                ["title"] = "",
                ["artist"] = "",
                ["album"] = "",
                ["source"] = "Spotify"
            };
        }

        private static string? GetSpotifyWindowTitle(Process[] procs)
        {
            var pids = new HashSet<uint>();
            foreach (var p in procs) pids.Add((uint)p.Id);

            string? result = null;

            EnumWindows((hWnd, lParam) =>
            {
                GetWindowThreadProcessId(hWnd, out uint pid);
                if (pids.Contains(pid))
                {
                    var sb = new StringBuilder(512);
                    GetWindowText(hWnd, sb, 512);
                    string t = sb.ToString().Trim();

                    if (!string.IsNullOrEmpty(t) && t != "AngleHiddenWindow" && t != "Default IME" && t != "MSCTFIME UI")
                    {
                        if (t.Contains(" - "))
                        {
                            result = t;
                            return false; // Stop enumeration
                        }
                        if (result == null && (t == "Spotify" || t.StartsWith("Spotify ")))
                        {
                            result = t;
                        }
                    }
                }
                return true;
            }, IntPtr.Zero);

            return result;
        }
    }
}
